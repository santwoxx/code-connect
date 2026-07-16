using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace CentralSyncBridge
{
    public static class AutomationEngine
    {
        // --- Win32 P/Invoke ---
        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll", EntryPoint = "SendMessageW", CharSet = CharSet.Unicode)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        // Win32 para busca avançada de janelas por título
        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        private const int SW_RESTORE = 9;
        private const int SW_SHOW = 5;

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        private const uint SWP_SHOWWINDOW = 0x0040;
        private const uint SWP_NOMOVE = 0x0002;
        private const uint SWP_NOSIZE = 0x0001;
        private const uint SWP_NOACTIVATE = 0x0010;

        [DllImport("user32.dll")]
        private static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
        private const byte VK_MENU = 0x12; // Alt key

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetCursorPos(int X, int Y);

        // Foco nativo do Win32 (diferente do AutomationElement.SetFocus() do UI Automation) —
        // funciona em alguns controles legados que rejeitam o SetFocus via UIA.
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetFocus(IntPtr hWnd);

        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;

        private const uint WM_GETTEXT = 0x000D;

        [DllImport("user32.dll", EntryPoint = "SendMessageW", CharSet = CharSet.Unicode)]
        private static extern IntPtr SendMessageGetText(IntPtr hWnd, uint Msg, int wParam, StringBuilder lParam);

        private const uint WM_SETTEXT = 0x000C;

        // Estruturas do SendInput
        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT
        {
            public uint type;
            public InputUnion U;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct InputUnion
        {
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct HARDWAREINPUT
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;
        private const uint KEYEVENTF_SCANCODE = 0x0008;

        // Virtual Keys para limpeza do campo
        private const ushort VK_BACK = 0x08;
        private const ushort VK_SHIFT = 0x10;
        private const ushort VK_END = 0x23;
        private const ushort VK_HOME = 0x24;

        public static void ForceForegroundWindow(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return;

            try
            {
                if (IsIconic(hWnd))
                {
                    ShowWindow(hWnd, SW_RESTORE);
                }
                else
                {
                    ShowWindow(hWnd, SW_SHOW);
                }

                // Simular pressionamento do ALT para burlar o bloqueio de roubo de foco do Windows
                keybd_event(VK_MENU, 0, 0, 0);
                keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);

                SetForegroundWindow(hWnd);
            }
            catch
            {
                try
                {
                    SetForegroundWindow(hWnd);
                }
                catch { }
            }
        }

        // --- Motor de Busca de Janelas ---

        public static IntPtr FindAlterdataWindow(string targetType, out bool isSimulator)
        {
            isSimulator = false;
            uint currentPid = (uint)Process.GetCurrentProcess().Id;

            // Listar todas as janelas do sistema
            List<KeyValuePair<IntPtr, string>> openWindows = new List<KeyValuePair<IntPtr, string>>();
            EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
            {
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string title = sb.ToString();
                if (!string.IsNullOrEmpty(title))
                {
                    openWindows.Add(new KeyValuePair<IntPtr, string>(hWnd, title));
                }
                return true;
            }, IntPtr.Zero);

            // 1. Procurar por janelas de processos de terceiros (Alterdata real)
            foreach (var win in openWindows)
            {
                uint pid;
                GetWindowThreadProcessId(win.Key, out pid);
                if (pid == currentPid) continue; // Pula o nosso processo (simulador)

                string title = win.Value;

                // Se estamos preenchendo cliente, procurar por janela com título "Clientes" ou "Cadastro"
                if (targetType == "cliente" && (title.IndexOf("Clientes", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Cadastro", StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    return win.Key;
                }

                // Se estamos preenchendo pedido, procurar por janela com título "Lançamento de Itens" ou "Itens"
                if (targetType == "pedido" && (title.IndexOf("Lançamento de Itens", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Itens", StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    return win.Key;
                }
            }

            // Fallback 1: Procurar por qualquer janela contendo "Nota Fácil", "Nota Facil" ou "Alterdata"
            foreach (var win in openWindows)
            {
                uint pid;
                GetWindowThreadProcessId(win.Key, out pid);
                if (pid == currentPid) continue;

                string title = win.Value;
                if (title.IndexOf("Nota Fácil", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Nota Facil", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Alterdata", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return win.Key;
                }
            }

            // 2. Se não achar nenhuma janela de terceiro, procurar o nosso simulador (processo atual)
            isSimulator = true;
            foreach (var win in openWindows)
            {
                uint pid;
                GetWindowThreadProcessId(win.Key, out pid);
                if (pid == currentPid)
                {
                    string title = win.Value;
                    if (title.IndexOf("Simulador", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        return win.Key;
                    }
                }
            }

            return IntPtr.Zero;
        }

        // Procura o popup dedicado de referência aberto pelo CentralSync (não a aba principal --
        // essa é pequena, feita pra ficar sempre visível, com um título exclusivo que não colide
        // com nada mais). Mesmo padrão de busca do FindAlterdataWindow.
        public static IntPtr FindCentralSyncBrowserWindow()
        {
            uint currentPid = (uint)Process.GetCurrentProcess().Id;
            IntPtr found = IntPtr.Zero;

            EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
            {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == currentPid) return true; // Pula o processo do próprio bridge

                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string title = sb.ToString();

                if (!string.IsNullOrEmpty(title) && title.IndexOf("Painel de Referência", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    found = hWnd;
                    return false; // Achou, para a enumeração
                }
                return true;
            }, IntPtr.Zero);

            return found;
        }

        // Fixa o Painel de Referência como "sempre visível" (topmost) -- de propósito, NUNCA
        // toca na janela do Alterdata (nem ShowWindow, nem MoveWindow). Tentar mover/restaurar
        // a janela de outro processo pode falhar (ex.: Alterdata rodando como administrador
        // enquanto o bridge roda sem elevação -- o Windows bloqueia essa mensagem entre
        // processos de nível de privilégio diferente, via UIPI) sem trazer benefício real: o
        // objetivo é só o painel nunca ficar escondido, não organizar a tela do Alterdata.
        // Devolve em popupHwndFound o handle do painel (IntPtr.Zero se não encontrado), pro
        // chamador poder manter o "sempre visível" reforçado continuamente depois.
        public static bool PinReferencePanel(Action<string> log, out IntPtr popupHwndFound)
        {
            popupHwndFound = IntPtr.Zero;

            // O popup pode ainda estar terminando de abrir/escrever seu conteúdo no instante em
            // que este pedido chega -- algumas tentativas curtas cobrem essa corrida.
            IntPtr popupHwnd = FindCentralSyncBrowserWindow();
            for (int retry = 0; popupHwnd == IntPtr.Zero && retry < 3; retry++)
            {
                Thread.Sleep(300);
                popupHwnd = FindCentralSyncBrowserWindow();
            }

            if (popupHwnd == IntPtr.Zero)
            {
                log("[LAYOUT] Não encontrei o Painel de Referência do CentralSync ainda aberto. Abra-o e tente novamente.");
                return false;
            }

            try
            {
                ShowWindow(popupHwnd, SW_RESTORE);
                Thread.Sleep(100);
                if (ReassertTopmost(popupHwnd))
                {
                    log("[LAYOUT] Painel de Referência fixado sempre visível.");
                    popupHwndFound = popupHwnd;
                    return true;
                }
                log("[LAYOUT] Falha ao fixar o Painel de Referência como sempre visível.");
                return false;
            }
            catch (Exception ex)
            {
                log(string.Format("[LAYOUT] Falha ao fixar o Painel de Referência: {0}", ex.Message));
                return false;
            }
        }

        // Reaplica HWND_TOPMOST sem mover/redimensionar nem roubar o foco -- usado pelo
        // MainForm num timer periódico pra garantir que o painel nunca fique pra trás, mesmo
        // que algo (ou algum comportamento do Windows/navegador) derrube o topmost entre as
        // aplicações pontuais. Retorna false se a chamada falhar (ex.: janela já foi fechada).
        public static bool ReassertTopmost(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) return false;
            return SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        }

        // Wrapper público do IsWindow (privado) pro MainForm poder checar se o handle do painel
        // ainda é válido sem precisar reimplementar a chamada nativa.
        public static bool IsWindowOpen(IntPtr hwnd)
        {
            return hwnd != IntPtr.Zero && IsWindow(hwnd);
        }

        public static AutomationElement GetWindowElement(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) return null;
            try
            {
                return AutomationElement.FromHandle(hwnd);
            }
            catch
            {
                return null;
            }
        }

        public static string DetectActiveScreen(AutomationElement window, out AutomationElement screenRoot)
        {
            screenRoot = window;
            if (window == null) return "Desconectado";

            try
            {
                string title = window.Current.Name;
                if (title == null) title = "";

                // Verifica o título do form principal ou de diálogos filhos
                if (title.IndexOf("Cliente", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Cadastro", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return "Cadastro de Cliente";
                }

                if (title.IndexOf("Item", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Itens", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Produto", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Pedido", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Lançamento", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return "Lançamento de Itens";
                }

                // Busca profunda se não identificou pelo título da janela principal
                Condition cond = new OrCondition(
                    new PropertyCondition(AutomationElement.NameProperty, "Cadastro de Cliente"),
                    new PropertyCondition(AutomationElement.NameProperty, "Lançamento de Itens")
                );

                AutomationElement subScreen = window.FindFirst(TreeScope.Descendants, cond);
                if (subScreen != null)
                {
                    screenRoot = subScreen;
                    return subScreen.Current.Name;
                }

                // Fallback por presença de campos chave
                if (FindControlByKeywords(window, new[] { "cpf", "cnpj", "cep" }, new[] { "CPF", "CNPJ", "CEP" }) != null)
                {
                    return "Cadastro de Cliente";
                }
                if (FindControlByKeywords(window, new[] { "produto", "quantidade", "desconto" }, new[] { "Produto", "Quantidade", "Desconto" }) != null)
                {
                    return "Lançamento de Itens";
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Erro ao detectar tela: " + ex.Message);
            }

            return "Desconhecido";
        }

        // --- Algoritmo de Busca de Controle ---

        // Controles DevExpress compostos (TcxDBTextEdit, TcxDBMaskEdit, TcxDBComboBox, etc.) têm um
        // filho puramente visual (TcxCustomInnerTextEdit, TcxCustomComboBoxInnerEdit, ...) que ocupa
        // quase a mesma área na tela do pai, mas não é focável via UI Automation ("O elemento de
        // destino não pode receber o foco") nem reflete o valor vinculado ao banco corretamente.
        // Como as duas classes acabam com distância geométrica praticamente igual ao rótulo, é fácil
        // a busca por proximidade escolher a peça interna errada. Detectamos isso pelo nome da classe.
        private static bool IsInnerSubElement(string className)
        {
            return !string.IsNullOrEmpty(className) && className.IndexOf("Inner", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static AutomationElement FindControlByKeywords(AutomationElement root, string[] idKeywords, string[] labelKeywords)
        {
            if (root == null) return null;

            try
            {
                // Obter TODOS os elementos da tela em uma única chamada COM rápida
                AutomationElementCollection allElements = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);

                List<AutomationElement> inputControls = new List<AutomationElement>();
                List<AutomationElement> labelControls = new List<AutomationElement>();

                foreach (AutomationElement el in allElements)
                {
                    try
                    {
                        var ctrlType = el.Current.ControlType;
                        string className = el.Current.ClassName ?? "";
                        string name = el.Current.Name ?? "";
                        string id = el.Current.AutomationId ?? "";

                        bool isLabel = ctrlType == ControlType.Text ||
                                       className.IndexOf("Label", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                       className.IndexOf("Static", StringComparison.OrdinalIgnoreCase) >= 0;

                        bool isInput = !isLabel && (
                                       ctrlType == ControlType.Edit ||
                                       ctrlType == ControlType.Document ||
                                       ctrlType == ControlType.Custom ||
                                       ctrlType == ControlType.Pane ||
                                       ctrlType == ControlType.ComboBox ||
                                       className.IndexOf("Edit", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                       className.IndexOf("Combo", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                       className.IndexOf("Text", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                       className.IndexOf("Mask", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                       className.IndexOf("Memo", StringComparison.OrdinalIgnoreCase) >= 0
                                       );

                        if (isInput)
                        {
                            inputControls.Add(el);

                            // Estratégia A: Casamento direto por ID ou Nome do controle.
                            // Ignora a peça visual interna aqui -- se ela por acaso tiver um ID/Nome
                            // que bate, preferimos continuar e deixar a Estratégia B (que já sabe
                            // preferir o controle externo) decidir, em vez de travar nela direto.
                            if (!IsInnerSubElement(className))
                            {
                                foreach (var kw in idKeywords)
                                {
                                    if (id.IndexOf(kw, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                        name.IndexOf(kw, StringComparison.OrdinalIgnoreCase) >= 0)
                                    {
                                        return el;
                                    }
                                }
                            }
                        }

                        if (isLabel && !string.IsNullOrEmpty(name))
                        {
                            labelControls.Add(el);
                        }
                    }
                    catch { }
                }

                // Estratégia B: Casamento por Rótulo Próximo/Adjacente.
                // Duas passadas: primeiro só entre controles "externos" (reais, focáveis); só considera
                // as peças "Inner" como último recurso, se nenhum controle externo estiver por perto.
                foreach (AutomationElement label in labelControls)
                {
                    try
                    {
                        string labelName = label.Current.Name ?? "";
                        bool matchesLabel = false;
                        foreach (var lkw in labelKeywords)
                        {
                            if (labelName.IndexOf(lkw, StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                matchesLabel = true;
                                break;
                            }
                        }

                        if (matchesLabel)
                        {
                            System.Windows.Rect labelRect = label.Current.BoundingRectangle;
                            if (!labelRect.IsEmpty)
                            {
                                for (int pass = 1; pass <= 2; pass++)
                                {
                                    bool allowInner = (pass == 2);
                                    AutomationElement bestMatch = null;
                                    double minDistance = double.MaxValue;

                                    foreach (AutomationElement edit in inputControls)
                                    {
                                        try
                                        {
                                            string editClassName = edit.Current.ClassName ?? "";
                                            if (!allowInner && IsInnerSubElement(editClassName)) continue;

                                            System.Windows.Rect editRect = edit.Current.BoundingRectangle;
                                            if (editRect.IsEmpty) continue;

                                            // O input deve estar à direita ou abaixo do rótulo (não pode estar na linha superior)
                                            if (editRect.Left >= labelRect.Left - 15 && editRect.Top >= labelRect.Top - 8)
                                            {
                                                double dist = Math.Sqrt(Math.Pow(editRect.Left - labelRect.Right, 2) + Math.Pow(editRect.Top - labelRect.Top, 2));
                                                if (dist < minDistance && dist < 350)
                                                {
                                                    minDistance = dist;
                                                    bestMatch = edit;
                                                }
                                            }
                                        }
                                        catch { }
                                    }
                                    if (bestMatch != null) return bestMatch;
                                }
                            }
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Erro na busca de controle: " + ex.Message);
            }

            return null;
        }

        public static void DumpEditableControls(AutomationElement root, Action<string> log)
        {
            if (root == null) return;
            try
            {
                AutomationElementCollection all = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                log(string.Format("[DUMP] Encontrados {0} controles no total na tela ativa:", all.Count));
                int limit = 0;
                foreach (AutomationElement el in all)
                {
                    if (limit++ > 80) break;
                    try
                    {
                        string id = el.Current.AutomationId ?? "N/A";
                        string name = el.Current.Name ?? "N/A";
                        string className = el.Current.ClassName ?? "N/A";
                        string typeName = el.Current.ControlType.ProgrammaticName ?? "N/A";
                        log(string.Format("  -> Classe: {0} | ID: {1} | Nome: {2} | Tipo: {3}", className, id, name, typeName));
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                log("Erro ao listar controles de diagnóstico: " + ex.Message);
            }
        }

        // --- Preenchimento em Cascata (Fallback) ---

        public static bool SetControlValue(IntPtr parentHwnd, AutomationElement element, string value, Action<string> log, bool forceKeyboard = true)
        {
            if (element == null) return false;

            string elName = element.Current.Name;
            if (string.IsNullOrEmpty(elName)) elName = element.Current.AutomationId;
            if (string.IsNullOrEmpty(elName)) elName = "Controle";

            if (!forceKeyboard)
            {
                // --- Nível 1: UI Automation (ValuePattern) ---
                log(string.Format("[AUTOMATION] Tentando escrever via UI Automation em '{0}'...", elName));
                try
                {
                    object valPatternObj;
                    if (element.TryGetCurrentPattern(ValuePattern.Pattern, out valPatternObj))
                    {
                        ValuePattern valPattern = (ValuePattern)valPatternObj;
                        if (!valPattern.Current.IsReadOnly)
                        {
                            valPattern.SetValue(value);
                            log(string.Format("[AUTOMATION] Sucesso usando ValuePattern em '{0}'.", elName));
                            return true;
                        }
                    }
                }
                catch (Exception ex)
                {
                    log(string.Format("[AUTOMATION] Falha no ValuePattern: {0}", ex.Message));
                }

                // --- Nível 2: Win32 Message (WM_SETTEXT) ---
                IntPtr hwnd = IntPtr.Zero;
                try
                {
                    hwnd = new IntPtr(element.Current.NativeWindowHandle);
                }
                catch { }

                if (hwnd != IntPtr.Zero)
                {
                    log(string.Format("[WIN32] NativeWindowHandle encontrado (0x{0}). Tentando WM_SETTEXT...", hwnd.ToString("X")));
                    try
                    {
                        SendMessage(hwnd, WM_SETTEXT, IntPtr.Zero, value);
                        Thread.Sleep(100);
                        
                        string valCheck = "";
                        try
                        {
                            object checkObj;
                            if (element.TryGetCurrentPattern(ValuePattern.Pattern, out checkObj))
                            {
                                valCheck = ((ValuePattern)checkObj).Current.Value;
                            }
                        }
                        catch { }

                        if (valCheck == value || string.IsNullOrEmpty(value) || valCheck.Contains(value) || valCheck.Length > 0)
                        {
                            log(string.Format("[WIN32] Sucesso via WM_SETTEXT em '{0}'.", elName));
                            return true;
                        }
                        else
                        {
                            log("[WIN32] WM_SETTEXT enviado, mas o valor do campo não parece ter mudado.");
                        }
                    }
                    catch (Exception ex)
                    {
                        log(string.Format("[WIN32] Falha ao enviar WM_SETTEXT: {0}", ex.Message));
                    }
                }
                else
                {
                    log("[WIN32] Controle não expõe NativeWindowHandle. Pulando WM_SETTEXT.");
                }
            }

            // --- Nível 3: Digitação caractere a caractere (o Alterdata bloqueia Ctrl+V/paste
            // nos campos, então nem tentamos colar — vamos direto pro método comprovado).
            // Tenta até 2 vezes: se a primeira digitação não for confirmada pela leitura de
            // volta do campo, repete antes de desistir — cobre falhas transitórias de foco.
            log(string.Format("[TECLADO] Preenchendo '{0}' com '{1}'...", elName, value));
            try
            {
                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    if (parentHwnd != IntPtr.Zero && GetForegroundWindow() != parentHwnd)
                    {
                        ForceForegroundWindow(parentHwnd);
                        Thread.Sleep(150);

                        // Confirma que a janela certa assumiu o primeiro plano antes de digitar,
                        // pra nunca digitar dados do cliente numa janela errada.
                        if (GetForegroundWindow() != parentHwnd)
                        {
                            log(string.Format("[AVISO] Não foi possível trazer a janela do Alterdata para frente antes de preencher '{0}'. Tentativa {1}/2.", elName, attempt));
                            if (attempt == 2)
                            {
                                log(string.Format("[ERRO] Abortando preenchimento de '{0}' para evitar digitar na janela errada.", elName));
                                return false;
                            }
                            Thread.Sleep(200);
                            continue;
                        }
                    }

                    FocusElementRobust(element, log);
                    Thread.Sleep(100);

                    // Confirma que o foco de teclado real (UIA) está no controle-alvo antes de
                    // limpar/digitar. Sem isso, quando o foco não muda (comum em campos mascarados
                    // legados que rejeitam SetFocus), o texto vai parar no controle que ficou com o
                    // foco anterior — foi exatamente isso que corrompeu o campo Nome com o CPF.
                    if (!ConfirmFocus(element, log))
                    {
                        if (attempt == 1)
                        {
                            log(string.Format("[AVISO] Não foi possível confirmar que o foco de teclado está em '{0}' (tentativa 1/2). Tentando novamente...", elName));
                            Thread.Sleep(150);
                            continue;
                        }
                        else
                        {
                            log(string.Format("[ERRO] Não foi possível confirmar o foco em '{0}' após 2 tentativas. Abortando este campo para não digitar em outro por engano — preencha manualmente.", elName));
                            return false;
                        }
                    }

                    ClearControlWithKeyboard();
                    Thread.Sleep(50);
                    TypeString(value);
                    Thread.Sleep(80);

                    string afterType = TryReadCurrentValue(element);
                    if (afterType == null || ValueLooksFilled(afterType, value))
                    {
                        log(string.Format("[TECLADO] Digitação concluída com sucesso em '{0}'.", elName));
                        return true;
                    }

                    if (attempt == 1)
                    {
                        log(string.Format("[AVISO] '{0}' não confirmou o valor esperado na 1ª tentativa, repetindo...", elName));
                        Thread.Sleep(150);
                    }
                    else
                    {
                        log(string.Format("[ERRO] '{0}' foi preenchido, mas o valor não confere com o esperado ('{1}') após 2 tentativas. O texto pode ter ido para o campo errado — confira manualmente.", elName, value));
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                log(string.Format("[TECLADO] Falha ao preencher '{0}': {1}", elName, ex.Message));
            }

            return false;
        }

        // Muitos controles legados DevExpress/VCL (TcxCustomInnerTextEdit, TcxDBMaskEdit, etc.)
        // não implementam o foco via UI Automation corretamente (element.SetFocus() lança
        // "O elemento de destino não pode receber o foco"), mesmo sendo clicáveis normalmente
        // com o mouse. Por isso o foco via UIA é best-effort aqui, com um clique simulado no
        // centro do controle como fallback universal. As falhas aqui não abortam sozinhas —
        // é o ConfirmFocus() logo depois, no chamador, que decide se o foco realmente pegou
        // antes de liberar a digitação.
        private static void FocusElementRobust(AutomationElement element, Action<string> log)
        {
            try
            {
                element.SetFocus();
                return;
            }
            catch (Exception ex)
            {
                log(string.Format("[FOCO] SetFocus via UI Automation falhou ({0}). Tentando foco nativo Win32...", ex.Message));
            }

            try
            {
                IntPtr hwnd = new IntPtr(element.Current.NativeWindowHandle);
                if (hwnd != IntPtr.Zero)
                {
                    SetFocus(hwnd);
                    return;
                }
                log("[FOCO] Controle não expõe NativeWindowHandle (comum em controles compostos DevExpress). Tentando clique simulado...");
            }
            catch (Exception ex)
            {
                log(string.Format("[FOCO] Foco nativo Win32 falhou ({0}). Tentando clique simulado...", ex.Message));
            }

            try
            {
                System.Windows.Rect rect = element.Current.BoundingRectangle;
                if (rect.IsEmpty)
                {
                    // Controles-container do DevExpress (ex.: TcxDBTextEdit classificado como
                    // ControlType.Pane) às vezes não expõem área própria -- a área visível/
                    // clicável real está num filho (a peça "Inner"). Clicar lá ainda move o
                    // foco de teclado real do Windows corretamente para este controle.
                    AutomationElement clickable = FindClickableDescendant(element);
                    if (clickable == null)
                    {
                        log("[FOCO] Controle sem área visível própria e sem nenhum filho clicável encontrado. Não foi possível simular o clique.");
                        return;
                    }
                    rect = clickable.Current.BoundingRectangle;
                    if (rect.IsEmpty) return;
                }

                int x = (int)(rect.Left + rect.Width / 2);
                int y = (int)(rect.Top + rect.Height / 2);

                SetCursorPos(x, y);
                Thread.Sleep(30);

                INPUT[] clickInputs = new INPUT[2];
                clickInputs[0] = CreateMouseEvent(MOUSEEVENTF_LEFTDOWN);
                clickInputs[1] = CreateMouseEvent(MOUSEEVENTF_LEFTUP);
                SendInput((uint)clickInputs.Length, clickInputs, Marshal.SizeOf(typeof(INPUT)));
            }
            catch (Exception ex)
            {
                log(string.Format("[FOCO] Clique simulado também falhou: {0}", ex.Message));
            }
        }

        // Procura o primeiro descendente com área visível (BoundingRectangle não vazio) --
        // usado quando o controle-alvo em si não expõe uma área própria pra clicar.
        private static AutomationElement FindClickableDescendant(AutomationElement element)
        {
            try
            {
                AutomationElementCollection children = element.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                foreach (AutomationElement child in children)
                {
                    try
                    {
                        if (!child.Current.BoundingRectangle.IsEmpty) return child;
                    }
                    catch { }
                }
            }
            catch { }
            return null;
        }

        // Confirma, via o foco de teclado real do Windows (UIA FocusedElement), que o controle
        // que estamos prestes a limpar/digitar é de fato quem vai receber as teclas. Sem essa
        // checagem, um FocusElementRobust que "aparentemente" rodou sem exceção pode não ter
        // movido foco nenhum — e a digitação vai parar no controle anterior (ex.: nome).
        //
        // Controles compostos do DevExpress reportam o foco de teclado real na peça visual
        // filha ("Inner"), não no controle pai vinculado ao banco que miramos -- então aceita
        // como confirmado tanto o próprio elemento-alvo quanto qualquer descendente dele,
        // subindo a árvore de automação a partir de quem está de fato focado.
        private static bool ConfirmFocus(AutomationElement element, Action<string> log)
        {
            try
            {
                AutomationElement focused = AutomationElement.FocusedElement;
                if (focused == null) return false;
                if (Automation.Compare(focused, element)) return true;

                TreeWalker walker = TreeWalker.RawViewWalker;
                AutomationElement current = focused;
                for (int depth = 0; depth < 6; depth++)
                {
                    current = walker.GetParent(current);
                    if (current == null) return false;
                    if (Automation.Compare(current, element)) return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                log(string.Format("[FOCO] Não foi possível ler o elemento com foco atual: {0}", ex.Message));
                return false;
            }
        }

        // Lê o valor atual do controle (via UI Automation ou WM_GETTEXT) para confirmar
        // se o preenchimento realmente colou/digitou o valor esperado.
        private static string TryReadCurrentValue(AutomationElement element)
        {
            try
            {
                object valPatternObj;
                if (element.TryGetCurrentPattern(ValuePattern.Pattern, out valPatternObj))
                {
                    return ((ValuePattern)valPatternObj).Current.Value;
                }
            }
            catch { }

            try
            {
                IntPtr hwnd = new IntPtr(element.Current.NativeWindowHandle);
                if (hwnd != IntPtr.Zero)
                {
                    StringBuilder sb = new StringBuilder(512);
                    SendMessageGetText(hwnd, WM_GETTEXT, sb.Capacity + 1, sb);
                    return sb.ToString();
                }
            }
            catch { }

            return null;
        }

        // Compara de forma tolerante (ignora caixa, espaços e, como fallback, só os dígitos —
        // útil para campos com máscara como CPF/CEP onde a formatação pode diferir).
        private static bool ValueLooksFilled(string current, string expected)
        {
            if (string.IsNullOrEmpty(current)) return false;

            string a = current.Trim();
            string b = (expected ?? "").Trim();
            if (b.Length == 0) return a.Length > 0;

            if (a.IndexOf(b, StringComparison.OrdinalIgnoreCase) >= 0) return true;

            string digitsA = new string(a.Where(char.IsDigit).ToArray());
            string digitsB = new string(b.Where(char.IsDigit).ToArray());
            if (digitsB.Length > 0 && digitsA.Contains(digitsB)) return true;

            return false;
        }

        private static INPUT CreateMouseEvent(uint flags)
        {
            INPUT input = new INPUT();
            input.type = 0; // INPUT_MOUSE
            input.U.mi = new MOUSEINPUT
            {
                dx = 0,
                dy = 0,
                mouseData = 0,
                dwFlags = flags,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            };
            return input;
        }

        private static void ClearControlWithKeyboard()
        {
            INPUT[] inputs = new INPUT[10];

            inputs[0] = CreateKeyEvent(VK_HOME, 0, false);
            inputs[1] = CreateKeyEvent(VK_HOME, 0, true);

            inputs[2] = CreateKeyEvent(VK_SHIFT, 0, false);

            inputs[3] = CreateKeyEvent(VK_END, 0, false);
            inputs[4] = CreateKeyEvent(VK_END, 0, true);

            inputs[5] = CreateKeyEvent(VK_SHIFT, 0, true);

            inputs[6] = CreateKeyEvent(VK_BACK, 0, false);
            inputs[7] = CreateKeyEvent(VK_BACK, 0, true);

            inputs[8] = CreateKeyEvent(VK_BACK, 0, false);
            inputs[9] = CreateKeyEvent(VK_BACK, 0, true);

            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
            Thread.Sleep(50);
        }

        private static void TypeString(string text)
        {
            if (string.IsNullOrEmpty(text)) return;

            INPUT[] inputs = new INPUT[text.Length * 2];

            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                inputs[i * 2] = CreateUnicodeEvent(c, false);
                inputs[i * 2 + 1] = CreateUnicodeEvent(c, true);
            }

            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        private static INPUT CreateKeyEvent(ushort wVk, ushort wScan, bool keyUp)
        {
            INPUT input = new INPUT();
            input.type = INPUT_KEYBOARD;
            input.U.ki = new KEYBDINPUT
            {
                wVk = wVk,
                wScan = wScan,
                dwFlags = keyUp ? KEYEVENTF_KEYUP : 0,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            };
            return input;
        }

        private static INPUT CreateUnicodeEvent(char c, bool keyUp)
        {
            INPUT input = new INPUT();
            input.type = INPUT_KEYBOARD;
            input.U.ki = new KEYBDINPUT
            {
                wVk = 0,
                wScan = (ushort)c,
                dwFlags = KEYEVENTF_UNICODE | (keyUp ? KEYEVENTF_KEYUP : 0),
                time = 0,
                dwExtraInfo = IntPtr.Zero
            };
            return input;
        }

        // --- Fluxos de Automação de Telas ---

        public static bool ExecuteClienteFlow(AutomationElement root, IntPtr parentHwnd, Dictionary<string, object> data, Action<string> log, out bool hadFailures)
        {
            log("Iniciando fluxo de automação de CLIENTE...");

            var fields = new Dictionary<string, KeyValuePair<string[], string[]>>();
            fields.Add("nome", new KeyValuePair<string[], string[]>(new[] { "nome", "razao", "social", "txtNome" }, new[] { "Nome", "Razão Social", "Nome/Razão Social" }));
            fields.Add("numero", new KeyValuePair<string[], string[]>(new[] { "numero", "txtNumero" }, new[] { "Número", "Nº" }));
            fields.Add("cpf", new KeyValuePair<string[], string[]>(new[] { "cpf", "cnpj", "txtCPF" }, new[] { "CPF", "CNPJ", "CPF/CNPJ" }));
            fields.Add("cep", new KeyValuePair<string[], string[]>(new[] { "cep", "txtCEP" }, new[] { "CEP" }));

            bool anySuccess = false;
            hadFailures = false;

            foreach (var field in fields)
            {
                string jsonKey = field.Key;
                if (!data.ContainsKey(jsonKey) || data[jsonKey] == null) continue;

                string valToFill = data[jsonKey].ToString();
                if (string.IsNullOrWhiteSpace(valToFill) ||
                    valToFill.Equals("Não informado", StringComparison.OrdinalIgnoreCase) ||
                    valToFill.Equals("Nãoinformado", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var kw = field.Value;

                log(string.Format("Procurando campo '{0}'...", jsonKey));
                AutomationElement ctrl = FindControlByKeywords(root, kw.Key, kw.Value);

                if (ctrl != null)
                {
                    bool ok = SetControlValue(parentHwnd, ctrl, valToFill, log);
                    if (ok) anySuccess = true;
                    else hadFailures = true;
                    Thread.Sleep(150);
                }
                else
                {
                    log(string.Format("[AVISO] Campo '{0}' não encontrado na tela de Cadastro de Cliente.", jsonKey));
                }
            }

            if (!anySuccess)
            {
                log("[DIAGNÓSTICO] Falha ao encontrar os campos do cliente. Listando todos os controles da tela:");
                DumpEditableControls(root, log);
            }

            return anySuccess;
        }

        public static bool ExecutePedidoFlow(AutomationElement root, IntPtr parentHwnd, Dictionary<string, object> data, Action<string> log, out bool hadFailures)
        {
            log("Iniciando fluxo de automação de PEDIDO...");

            hadFailures = false;

            // 1. Preencher campo do Cliente
            if (data.ContainsKey("cliente") && data["cliente"] != null)
            {
                string cli = data["cliente"].ToString();
                log("Procurando campo de Cliente...");
                AutomationElement cliCtrl = FindControlByKeywords(root, new[] { "cliente", "codcliente", "txtCliente" }, new[] { "Cliente", "Cod. Cliente", "Nome Cliente" });
                if (cliCtrl != null)
                {
                    if (!SetControlValue(parentHwnd, cliCtrl, cli, log)) hadFailures = true;
                    Thread.Sleep(150);
                }
                else
                {
                    log("[AVISO] Campo 'cliente' não encontrado.");
                }
            }

            // 2. Preencher os itens do pedido
            if (!data.ContainsKey("produtos"))
            {
                log("Nenhum produto listado no JSON do pedido.");
                return true;
            }

            var itemsList = data["produtos"] as System.Collections.IEnumerable;
            if (itemsList == null) return false;

            int idx = 1;
            bool anySuccess = false;

            foreach (var itemObj in itemsList)
            {
                var item = itemObj as Dictionary<string, object>;
                if (item == null) continue;

                log(string.Format("Preenchendo Item #{0}...", idx));

                string codigo = item.ContainsKey("codigo") && item["codigo"] != null ? item["codigo"].ToString() : "";
                string quantidade = item.ContainsKey("quantidade") && item["quantidade"] != null ? item["quantidade"].ToString() : "1";
                string desconto = item.ContainsKey("desconto") && item["desconto"] != null ? item["desconto"].ToString() : "0";
                string valor = item.ContainsKey("valor") && item["valor"] != null ? item["valor"].ToString() : "";

                if (!string.IsNullOrEmpty(codigo))
                {
                    AutomationElement prodCtrl = FindControlByKeywords(root, new[] { "produto", "codigo", "codprod", "txtProduto" }, new[] { "Produto", "Cód. Produto", "Código" });
                    if (prodCtrl != null)
                    {
                        if (SetControlValue(parentHwnd, prodCtrl, codigo, log)) anySuccess = true;
                        else hadFailures = true;
                        Thread.Sleep(150);
                    }
                }

                AutomationElement qtdCtrl = FindControlByKeywords(root, new[] { "quantidade", "qtd", "txtQuantidade" }, new[] { "Quantidade", "Qtd", "Qtd." });
                if (qtdCtrl != null)
                {
                    if (SetControlValue(parentHwnd, qtdCtrl, quantidade, log)) anySuccess = true;
                    else hadFailures = true;
                    Thread.Sleep(150);
                }

                AutomationElement descCtrl = FindControlByKeywords(root, new[] { "desconto", "desc", "txtDesconto" }, new[] { "Desconto", "Desc.", "Desc" });
                if (descCtrl != null)
                {
                    if (SetControlValue(parentHwnd, descCtrl, desconto, log)) anySuccess = true;
                    else hadFailures = true;
                    Thread.Sleep(150);
                }

                if (!string.IsNullOrEmpty(valor))
                {
                    AutomationElement valCtrl = FindControlByKeywords(root, new[] { "valor", "preco", "txtValor" }, new[] { "Valor", "Preço", "Preço Unitário", "Vlr Unit" });
                    if (valCtrl != null)
                    {
                        if (SetControlValue(parentHwnd, valCtrl, valor, log)) anySuccess = true;
                        else hadFailures = true;
                        Thread.Sleep(150);
                    }
                }

                log(string.Format("Item #{0} finalizado. Simular tecla Enter para adicionar o item...", idx));
                try
                {
                    if (parentHwnd != IntPtr.Zero) ForceForegroundWindow(parentHwnd);
                    INPUT[] enterInput = new INPUT[2];
                    enterInput[0] = CreateKeyEvent(0x0D, 0, false); // VK_RETURN
                    enterInput[1] = CreateKeyEvent(0x0D, 0, true);
                    SendInput(2, enterInput, Marshal.SizeOf(typeof(INPUT)));
                }
                catch { }

                Thread.Sleep(500);
                idx++;
            }

            if (!anySuccess)
            {
                log("[DIAGNÓSTICO] Falha ao encontrar os campos do pedido. Listando todos os controles da tela:");
                DumpEditableControls(root, log);
            }

            return anySuccess;
        }
    }
}
