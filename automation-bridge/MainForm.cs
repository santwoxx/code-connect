using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using Microsoft.Win32;

namespace CentralSyncBridge
{
    public class MainForm : Form
    {
        private HttpServer _server;
        private SimulatorForm _simulator;
        // Garante que dois pedidos de automação (ex.: cliques quase simultâneos) nunca
        // rodem ao mesmo tempo — evita que um fluxo digite/cole por cima do outro na mesma janela.
        private static readonly object _automationLock = new object();
        private System.Windows.Forms.Timer _processCheckTimer;

        // Reforça HWND_TOPMOST no Painel de Referência periodicamente enquanto ele estiver
        // aberto -- uma aplicação pontual de SetWindowPos pode não sobreviver a tudo que pode
        // acontecer na tela do usuário, então isso garante que ele nunca fique escondido.
        private System.Windows.Forms.Timer _topmostEnforcerTimer;
        private IntPtr _painelReferenciaHwnd = IntPtr.Zero;

        // UI Components
        private Panel pnlHeader;
        private Label lblTitle;
        private Label lblSubtitle;

        private Panel pnlLeft;
        private Panel pnlRight;

        // Tab Control
        private TabControl tabMain;
        private TabPage tabLogs;
        private TabPage tabManualTest;

        // Cards
        private Panel cardStatus;
        private Panel cardControls;
        private Panel cardLastReceived;
        private Panel cardLog;

        // Manual Test Input Panels
        private Panel cardTestCliente;
        private Panel cardTestPedido;

        // Status Elements
        private Label lblServerLedName;
        private Label lblAlterdataLedName;
        private PictureBox pbServerLed;
        private PictureBox pbAlterdataLed;
        private Label lblServerStatusText;
        private Label lblAlterdataStatusText;

        // Controls Buttons
        private Button btnDetect;
        private Button btnSimulator;
        private Button btnTest;
        private CheckBox chkStartup;

        // Last Received Data Display
        private Label lblLastClientTitle;
        private Label lblLastClientVal;
        private Label lblLastOrderTitle;
        private Label lblLastOrderVal;

        // Log View
        private RichTextBox rtfLog;

        // --- Campos de Teste Manual (Cliente) ---
        private TextBox txtTestNome;
        private TextBox txtTestCPF;
        private TextBox txtTestCEP;
        private TextBox txtTestEndereco;
        private TextBox txtTestNumero;
        private TextBox txtTestBairro;
        private TextBox txtTestCidade;
        private TextBox txtTestUF;
        private TextBox txtTestCelular;
        private Button btnSendManualCliente;

        // --- Campos de Teste Manual (Pedido) ---
        private TextBox txtTestPedCliente;
        private TextBox txtTestPedProduto;
        private TextBox txtTestPedQtd;
        private TextBox txtTestPedDesc;
        private TextBox txtTestPedValor;
        private Button btnSendManualPedido;

        // Cores do Tema (Premium Dark)
        private static readonly Color ColorBg = Color.FromArgb(20, 20, 24);
        private static readonly Color ColorCard = Color.FromArgb(28, 28, 36);
        private static readonly Color ColorCardBorder = Color.FromArgb(48, 48, 60);
        private static readonly Color ColorText = Color.FromArgb(240, 240, 245);
        private static readonly Color ColorTextMuted = Color.FromArgb(145, 145, 160);

        private static readonly Color ColorLedGreen = Color.FromArgb(0, 220, 120);
        private static readonly Color ColorLedOrange = Color.FromArgb(255, 150, 0);
        private static readonly Color ColorLedRed = Color.FromArgb(255, 75, 90);
        
        private static readonly Color ColorButtonBg = Color.FromArgb(38, 38, 48);
        private static readonly Color ColorButtonHover = Color.FromArgb(58, 58, 72);
        private static readonly Color ColorAccent = Color.FromArgb(115, 80, 255);

        // Status Variables
        private bool _serverRunning = false;
        private string _alterdataState = "Não Encontrado";
        private string _lastClientDesc = "Nenhum cliente recebido ainda.";
        private string _lastOrderDesc = "Nenhum pedido recebido ainda.";

        public MainForm()
        {
            InitializeComponent();
            InitializeServer();
            RegisterCustomProtocol();
        }

        private void InitializeComponent()
        {
            this.Text = "CentralSync Bridge - Automação Alterdata";
            this.Size = new Size(820, 620);
            this.MinimumSize = new Size(820, 620);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = ColorBg;
            this.ForeColor = ColorText;
            this.Font = new Font("Segoe UI", 9.5F);

            // --- HEADER PANEL ---
            pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 80;
            pnlHeader.BackColor = Color.FromArgb(16, 16, 20);
            pnlHeader.Padding = new Padding(20, 15, 20, 15);

            lblTitle = new Label();
            lblTitle.Text = "CENTRALSYNC BRIDGE";
            lblTitle.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            lblTitle.ForeColor = ColorText;
            lblTitle.Location = new Point(20, 15);
            lblTitle.AutoSize = true;

            lblSubtitle = new Label();
            lblSubtitle.Text = "Integração Automática com Alterdata Nota Fácil";
            lblSubtitle.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblSubtitle.ForeColor = ColorTextMuted;
            lblSubtitle.Location = new Point(22, 45);
            lblSubtitle.AutoSize = true;

            pnlHeader.Controls.Add(lblTitle);
            pnlHeader.Controls.Add(lblSubtitle);

            // --- MAIN LAYOUT PANELS ---
            pnlLeft = new Panel();
            pnlLeft.Dock = DockStyle.Left;
            pnlLeft.Width = 280;
            pnlLeft.Padding = new Padding(15);

            pnlRight = new Panel();
            pnlRight.Dock = DockStyle.Fill;
            pnlRight.Padding = new Padding(0, 15, 15, 15);

            // --- CARD: STATUS (LEFT) ---
            cardStatus = CreateCard("CONEXÃO & STATUS", 15, 15, 250, 140);
            
            lblServerLedName = new Label { Text = "Servidor Local (7878):", Location = new Point(15, 35), AutoSize = true, ForeColor = ColorTextMuted };
            pbServerLed = new PictureBox { Size = new Size(18, 18), Location = new Point(15, 58) };
            pbServerLed.Paint += new PaintEventHandler(pbServerLed_Paint);
            lblServerStatusText = new Label { Text = "Parado", Location = new Point(38, 57), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };

            lblAlterdataLedName = new Label { Text = "Status Alterdata:", Location = new Point(15, 85), AutoSize = true, ForeColor = ColorTextMuted };
            pbAlterdataLed = new PictureBox { Size = new Size(18, 18), Location = new Point(15, 108) };
            pbAlterdataLed.Paint += new PaintEventHandler(pbAlterdataLed_Paint);
            lblAlterdataStatusText = new Label { Text = _alterdataState, Location = new Point(38, 107), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };

            cardStatus.Controls.Add(lblServerLedName);
            cardStatus.Controls.Add(pbServerLed);
            cardStatus.Controls.Add(lblServerStatusText);
            cardStatus.Controls.Add(lblAlterdataLedName);
            cardStatus.Controls.Add(pbAlterdataLed);
            cardStatus.Controls.Add(lblAlterdataStatusText);

            // --- CARD: CONTROLS (LEFT) ---
            cardControls = CreateCard("AÇÕES", 15, 170, 250, 215);
            
            btnDetect = CreateButton("Detectar Alterdata", 15, 35, 220, 38);
            btnDetect.Click += new EventHandler(BtnDetect_Click);

            btnSimulator = CreateButton("Abrir Simulador Alterdata", 15, 80, 220, 38);
            btnSimulator.Click += new EventHandler(BtnSimulator_Click);

            btnTest = CreateButton("Executar Teste Rápido", 15, 125, 220, 38);
            btnTest.Click += new EventHandler(BtnTest_Click);

            chkStartup = new CheckBox();
            chkStartup.Text = "Iniciar junto com o Windows";
            chkStartup.Location = new Point(15, 175);
            chkStartup.Size = new Size(220, 24);
            chkStartup.ForeColor = ColorTextMuted;
            chkStartup.Font = new Font("Segoe UI", 8.5F);
            chkStartup.Checked = IsRunningOnStartup();
            chkStartup.CheckedChanged += new EventHandler(ChkStartup_CheckedChanged);

            cardControls.Controls.Add(btnDetect);
            cardControls.Controls.Add(btnSimulator);
            cardControls.Controls.Add(btnTest);
            cardControls.Controls.Add(chkStartup);

            Label lblInfo = new Label();
            lblInfo.Text = "CentralSync Bridge v1.0.0\r\nCompilado Nativo .NET";
            lblInfo.ForeColor = ColorTextMuted;
            lblInfo.Font = new Font("Segoe UI", 8F);
            lblInfo.Location = new Point(15, 395);
            lblInfo.Size = new Size(250, 40);
            lblInfo.TextAlign = ContentAlignment.TopCenter;

            pnlLeft.Controls.Add(cardStatus);
            pnlLeft.Controls.Add(cardControls);
            pnlLeft.Controls.Add(lblInfo);

            // --- TAB CONTROL (RIGHT) ---
            tabMain = new TabControl();
            tabMain.Dock = DockStyle.Fill;
            tabMain.Location = new Point(0, 0);
            tabMain.DrawMode = TabDrawMode.OwnerDrawFixed;
            tabMain.DrawItem += new DrawItemEventHandler(TabMain_DrawItem);

            tabLogs = new TabPage("Painel & Logs");
            tabLogs.BackColor = ColorBg;
            tabLogs.Padding = new Padding(5);

            tabManualTest = new TabPage("Formulário de Teste");
            tabManualTest.BackColor = ColorBg;
            tabManualTest.Padding = new Padding(5);

            // --- TAB 1: LOGS & PANEL ---
            cardLastReceived = CreateCard("ÚLTIMOS DADOS PROCESSADOS", 0, 0, 490, 130);
            cardLastReceived.Dock = DockStyle.Top;
            
            lblLastClientTitle = new Label { Text = "Último Cliente:", Location = new Point(15, 30), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold), ForeColor = ColorAccent };
            lblLastClientVal = new Label { Text = _lastClientDesc, Location = new Point(15, 50), Width = 460, Height = 30, ForeColor = ColorText, AutoSize = false };

            lblLastOrderTitle = new Label { Text = "Último Pedido:", Location = new Point(15, 80), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold), ForeColor = ColorAccent };
            lblLastOrderVal = new Label { Text = _lastOrderDesc, Location = new Point(15, 100), Width = 460, Height = 30, ForeColor = ColorText, AutoSize = false };

            cardLastReceived.Controls.Add(lblLastClientTitle);
            cardLastReceived.Controls.Add(lblLastClientVal);
            cardLastReceived.Controls.Add(lblLastOrderTitle);
            cardLastReceived.Controls.Add(lblLastOrderVal);

            Panel pnlSpacer = new Panel();
            pnlSpacer.Dock = DockStyle.Top;
            pnlSpacer.Height = 15;

            cardLog = CreateCard("LOG DE EVENTOS EM TEMPO REAL", 0, 145, 490, 320);
            cardLog.Dock = DockStyle.Fill;

            rtfLog = new RichTextBox();
            rtfLog.Location = new Point(15, 30);
            rtfLog.Width = 460;
            rtfLog.Height = 275;
            rtfLog.Dock = DockStyle.Fill;
            rtfLog.BackColor = Color.FromArgb(20, 20, 24);
            rtfLog.ForeColor = Color.FromArgb(220, 220, 225);
            rtfLog.BorderStyle = BorderStyle.None;
            rtfLog.Font = new Font("Consolas", 9);
            rtfLog.ReadOnly = true;
            rtfLog.SelectAll();
            rtfLog.SelectionIndent = 10;
            rtfLog.SelectionRightIndent = 10;
            rtfLog.DeselectAll();

            cardLog.Controls.Add(rtfLog);

            tabLogs.Controls.Add(cardLog);
            tabLogs.Controls.Add(pnlSpacer);
            tabLogs.Controls.Add(cardLastReceived);

            // --- TAB 2: MANUAL FORM ---
            cardTestCliente = CreateCard("DADOS DO CLIENTE", 5, 5, 240, 455);
            int mY = 25;
            int gap = 36;
            AddManualField(cardTestCliente, "Nome/Razão Social:", ref txtTestNome, mY, 210);
            AddManualField(cardTestCliente, "CPF/CNPJ:", ref txtTestCPF, mY += gap, 130);
            AddManualField(cardTestCliente, "CEP:", ref txtTestCEP, mY += gap, 100);
            AddManualField(cardTestCliente, "Endereço:", ref txtTestEndereco, mY += gap, 210);
            AddManualField(cardTestCliente, "Número:", ref txtTestNumero, mY += gap, 70);
            AddManualField(cardTestCliente, "Bairro:", ref txtTestBairro, mY += gap, 150);
            AddManualField(cardTestCliente, "Cidade:", ref txtTestCidade, mY += gap, 150);
            AddManualField(cardTestCliente, "UF:", ref txtTestUF, mY += gap, 50);
            AddManualField(cardTestCliente, "Celular:", ref txtTestCelular, mY += gap, 130);
            
            btnSendManualCliente = CreateButton("Enviar Cliente", 15, 400, 210, 32);
            btnSendManualCliente.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnSendManualCliente.Click += new EventHandler(BtnSendManualCliente_Click);
            cardTestCliente.Controls.Add(btnSendManualCliente);

            cardTestPedido = CreateCard("DADOS DO PEDIDO", 255, 5, 240, 455);
            mY = 25;
            AddManualField(cardTestPedido, "Nome do Cliente:", ref txtTestPedCliente, mY, 210);
            AddManualField(cardTestPedido, "Código do Produto:", ref txtTestPedProduto, mY += gap + 15, 150);
            AddManualField(cardTestPedido, "Quantidade:", ref txtTestPedQtd, mY += gap + 15, 100);
            txtTestPedQtd.Text = "1";
            AddManualField(cardTestPedido, "Desconto (%):", ref txtTestPedDesc, mY += gap + 15, 100);
            txtTestPedDesc.Text = "0";
            AddManualField(cardTestPedido, "Valor Unitário (Opcional):", ref txtTestPedValor, mY += gap + 15, 100);

            btnSendManualPedido = CreateButton("Enviar Pedido", 15, 400, 210, 32);
            btnSendManualPedido.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnSendManualPedido.Click += new EventHandler(BtnSendManualPedido_Click);
            cardTestPedido.Controls.Add(btnSendManualPedido);

            tabManualTest.Controls.Add(cardTestCliente);
            tabManualTest.Controls.Add(cardTestPedido);

            // Assemble TabControl
            tabMain.Controls.Add(tabLogs);
            tabMain.Controls.Add(tabManualTest);

            pnlRight.Controls.Add(tabMain);

            this.Controls.Add(pnlRight);
            this.Controls.Add(pnlLeft);
            this.Controls.Add(pnlHeader);

            _processCheckTimer = new System.Windows.Forms.Timer();
            _processCheckTimer.Interval = 3000;
            _processCheckTimer.Tick += new EventHandler(processTimer_Tick);
            _processCheckTimer.Start();

            this.FormClosing += new FormClosingEventHandler(MainForm_FormClosing);
        }

        private void TabMain_DrawItem(object sender, DrawItemEventArgs e)
        {
            TabControl tab = (TabControl)sender;
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle rect = tab.GetTabRect(e.Index);
            bool selected = (tab.SelectedIndex == e.Index);

            Color tabBg = selected ? ColorCard : ColorBg;
            using (SolidBrush bgBrush = new SolidBrush(tabBg))
            {
                g.FillRectangle(bgBrush, rect);
            }

            string text = tab.TabPages[e.Index].Text;
            Font textFont = new Font("Segoe UI", 9F, selected ? FontStyle.Bold : FontStyle.Regular);
            Color textCol = selected ? ColorLedGreen : ColorTextMuted;

            TextRenderer.DrawText(g, text, textFont, rect, textCol, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);

            if (selected)
            {
                using (Pen pen = new Pen(ColorAccent, 2))
                {
                    g.DrawLine(pen, rect.Left, rect.Bottom - 1, rect.Right, rect.Bottom - 1);
                }
            }
        }

        private void AddManualField(Panel parent, string labelText, ref TextBox txt, int y, int width)
        {
            Label lbl = new Label
            {
                Text = labelText,
                Location = new Point(15, y),
                AutoSize = true,
                Font = new Font("Segoe UI", 8F),
                ForeColor = ColorTextMuted
            };
            txt = new TextBox
            {
                Location = new Point(15, y + 14),
                Width = width,
                Font = new Font("Segoe UI", 8.5F),
                BackColor = Color.FromArgb(36, 36, 44),
                ForeColor = ColorText,
                BorderStyle = BorderStyle.FixedSingle
            };
            parent.Controls.Add(lbl);
            parent.Controls.Add(txt);
        }

        private void pbServerLed_Paint(object sender, PaintEventArgs e)
        {
            DrawLed(e.Graphics, _serverRunning ? ColorLedGreen : ColorLedRed);
        }

        private void pbAlterdataLed_Paint(object sender, PaintEventArgs e)
        {
            DrawLed(e.Graphics, GetAlterdataLedColor());
        }

        private void processTimer_Tick(object sender, EventArgs e)
        {
            VerifyAlterdataStatus(false);
        }

        private Panel CreateCard(string title, int x, int y, int width, int height)
        {
            Panel card = new Panel();
            card.Size = new Size(width, height);
            card.Location = new Point(x, y);
            card.BackColor = ColorCard;
            card.Padding = new Padding(15, 30, 15, 15);

            card.Paint += delegate(object s, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (Pen pen = new Pen(ColorCardBorder, 1))
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, card.Width - 1, card.Height - 1);
                }
                e.Graphics.DrawString(title, new Font("Segoe UI", 8F, FontStyle.Bold), new SolidBrush(ColorTextMuted), 15, 10);
            };

            return card;
        }

        private Button CreateButton(string text, int x, int y, int width, int height)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Location = new Point(x, y);
            btn.Size = new Size(width, height);
            btn.BackColor = ColorButtonBg;
            btn.ForeColor = ColorText;
            btn.FlatStyle = FlatStyle.Flat;
            btn.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            btn.FlatAppearance.BorderSize = 1;
            btn.FlatAppearance.BorderColor = ColorCardBorder;

            btn.MouseEnter += delegate(object s, EventArgs e) {
                btn.BackColor = ColorButtonHover;
                btn.FlatAppearance.BorderColor = ColorAccent;
            };
            btn.MouseLeave += delegate(object s, EventArgs e) {
                btn.BackColor = ColorButtonBg;
                btn.FlatAppearance.BorderColor = ColorCardBorder;
            };

            return btn;
        }

        private void DrawLed(Graphics g, Color ledColor)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;

            using (GraphicsPath path = new GraphicsPath())
            {
                path.AddEllipse(0, 0, 18, 18);
                using (PathGradientBrush glowBrush = new PathGradientBrush(path))
                {
                    glowBrush.CenterColor = Color.FromArgb(80, ledColor);
                    glowBrush.SurroundColors = new Color[] { Color.Transparent };
                    g.FillRectangle(glowBrush, 0, 0, 18, 18);
                }
            }

            using (SolidBrush ledBrush = new SolidBrush(ledColor))
            {
                g.FillEllipse(ledBrush, 3, 3, 12, 12);
            }

            using (SolidBrush specBrush = new SolidBrush(Color.FromArgb(180, Color.White)))
            {
                g.FillEllipse(specBrush, 5, 5, 3, 3);
            }
        }

        private Color GetAlterdataLedColor()
        {
            if (_alterdataState == "Conectado") return ColorLedGreen;
            if (_alterdataState == "Tela Incorreta") return ColorLedOrange;
            return ColorLedRed;
        }

        // --- SERVER INITIALIZATION ---

        private void InitializeServer()
        {
            _server = new HttpServer(7878);
            _server.OnLog += delegate(string msg) {
                LogSafe("[SERVER] " + msg, ColorTextMuted);
            };
            
            _server.OnClientReceived += delegate(Dictionary<string, object> data) {
                this.BeginInvoke((MethodInvoker)delegate {
                    string nome = data.ContainsKey("nome") ? data["nome"].ToString() : "Desconhecido";
                    string cpf = data.ContainsKey("cpf") ? data["cpf"].ToString() : "N/A";
                    _lastClientDesc = string.Format("{0} (CPF: {1}) em {2}", nome, cpf, DateTime.Now.ToString("HH:mm:ss"));
                    lblLastClientVal.Text = _lastClientDesc;
                });

                lock (_automationLock)
                {
                    ProcessAutomationFlow(data, "cliente");
                }
            };

            _server.OnOrderReceived += delegate(Dictionary<string, object> data) {
                this.BeginInvoke((MethodInvoker)delegate {
                    string cli = data.ContainsKey("cliente") ? data["cliente"].ToString() : "Desconhecido";
                    int count = 0;
                    if (data.ContainsKey("produtos") && data["produtos"] is System.Collections.IEnumerable)
                    {
                        var list = (System.Collections.IEnumerable)data["produtos"];
                        foreach (var i in list) count++;
                    }
                    _lastOrderDesc = string.Format("Cliente: {0} | {1} item(ns) em {2}", cli, count, DateTime.Now.ToString("HH:mm:ss"));
                    lblLastOrderVal.Text = _lastOrderDesc;
                });

                lock (_automationLock)
                {
                    ProcessAutomationFlow(data, "pedido");
                }
            };

            _server.OnArrangeWindowsRequested += delegate(Dictionary<string, object> data) {
                lock (_automationLock)
                {
                    ProcessPinPanelFlow();
                }
            };

            _server.Start();
            _serverRunning = true;
            pbServerLed.Invalidate();
            lblServerStatusText.Text = "Ativo";
            LogSafe("Ponte de Comunicação CentralSync Bridge Iniciada.", ColorLedGreen);
        }

        private void RegisterCustomProtocol()
        {
            try
            {
                string path = Application.ExecutablePath;
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\centralsync-bridge"))
                {
                    if (key != null)
                    {
                        key.SetValue("", "URL:CentralSync Bridge Protocol");
                        key.SetValue("URL Protocol", "");

                        using (RegistryKey commandKey = key.CreateSubKey(@"shell\open\command"))
                        {
                            if (commandKey != null)
                            {
                                commandKey.SetValue("", string.Format("\"{0}\" \"%1\"", path));
                            }
                        }
                    }
                }
                LogSafe("Protocolo customizado 'centralsync-bridge://' registrado/atualizado com sucesso.", ColorTextMuted);
            }
            catch (Exception ex)
            {
                LogSafe("Erro ao registrar protocolo customizado: " + ex.Message, ColorLedOrange);
            }
        }

        // --- AUTOMATION CONTROLLER ---

        private void ProcessAutomationFlow(Dictionary<string, object> data, string tipo)
        {
            LogSafe(string.Format("Processando comando '{0}' recebido...", tipo), ColorAccent);

            bool isSim;
            IntPtr hWnd = AutomationEngine.FindAlterdataWindow(tipo, out isSim);

            // Pequena tentativa extra caso a janela do Alterdata ainda esteja
            // carregando/trocando de tela no instante em que o pedido chegou.
            for (int retry = 0; hWnd == IntPtr.Zero && retry < 2; retry++)
            {
                Thread.Sleep(400);
                hWnd = AutomationEngine.FindAlterdataWindow(tipo, out isSim);
            }

            if (isSim && (hWnd == IntPtr.Zero || _simulator == null || _simulator.IsDisposed || !_simulator.Visible))
            {
                this.Invoke((MethodInvoker)delegate
                {
                    if (_simulator == null || _simulator.IsDisposed)
                    {
                        _simulator = new SimulatorForm();
                    }
                    _simulator.Show();
                    LogSafe("Simulador aberto automaticamente para receber automação.", ColorLedGreen);
                });
                Thread.Sleep(800);
                hWnd = AutomationEngine.FindAlterdataWindow(tipo, out isSim);
            }

            if (isSim && _simulator != null && _simulator.Visible)
            {
                this.Invoke((MethodInvoker)delegate
                {
                    TabControl tab = (TabControl)_simulator.Controls["tabControlSim"];
                    if (tab != null)
                    {
                        tab.SelectedIndex = (tipo == "cliente") ? 0 : 1;
                    }
                });
                Thread.Sleep(300);
            }

            if (hWnd == IntPtr.Zero)
            {
                LogSafe("[ERRO] Alterdata (Nota Fácil) ou janela correspondente não foi encontrada na máquina. Certifique-se de que a tela correta está aberta.", ColorLedRed);
                UpdateAlterdataStatus("Não Encontrado");
                throw new Exception("Janela do Alterdata não encontrada.");
            }

            var rootElement = AutomationEngine.GetWindowElement(hWnd);
            if (rootElement == null)
            {
                LogSafe("[ERRO] Não foi possível ler os controles da janela ativa (Acesso Negado ou Handle inválido).", ColorLedRed);
                throw new Exception("Falha ao acessar janela.");
            }

            System.Windows.Automation.AutomationElement screenRoot;
            string screen = AutomationEngine.DetectActiveScreen(rootElement, out screenRoot);
            LogSafe(string.Format("Tela detectada no Alterdata: {0}", screen), ColorText);

            if (tipo == "cliente")
            {
                if (screen != "Cadastro de Cliente" && screen != "Desconhecido")
                {
                    LogSafe(string.Format("[ERRO] Tentativa de cadastrar cliente, mas a tela aberta é '{0}'. Abra a tela 'Cadastro de Cliente'.", screen), ColorLedOrange);
                    UpdateAlterdataStatus("Tela Incorreta");
                    throw new Exception(string.Format("Tela incorreta. Esperado: 'Cadastro de Cliente', Atual: '{0}'", screen));
                }

                UpdateAlterdataStatus("Conectado");
                AutomationEngine.ForceForegroundWindow(hWnd);
                Thread.Sleep(300);

                if (screen == "Desconhecido")
                {
                    LogSafe("[AVISO] Não foi possível certificar o título da tela do Alterdata, mas prosseguindo com a tentativa de envio.", ColorLedOrange);
                }

                bool hadFailures;
                bool ok = AutomationEngine.ExecuteClienteFlow(screenRoot, hWnd, data, delegate(string msg) {
                    LogSafe(msg, ColorTextMuted);
                }, out hadFailures);

                if (hadFailures)
                {
                    LogSafe("[ERRO] Um ou mais campos do cliente NÃO foram confirmados corretamente pelo motor de automação. O texto pode ter ido para o campo errado — confira a tela do Alterdata antes de prosseguir.", ColorLedRed);
                }
                else if (ok)
                {
                    LogSafe("[SUCESSO] Todos os dados do cliente foram enviados com sucesso ao Alterdata!", ColorLedGreen);
                }
                else
                {
                    LogSafe("[AVISO] Nenhum campo foi modificado. Verifique a tela.", ColorLedOrange);
                }
            }
            else if (tipo == "pedido")
            {
                if (screen != "Lançamento de Itens" && screen != "Desconhecido")
                {
                    LogSafe(string.Format("[ERRO] Tentativa de lançar pedido, mas a tela aberta é '{0}'. Abra a tela 'Lançamento de Itens'.", screen), ColorLedOrange);
                    UpdateAlterdataStatus("Tela Incorreta");
                    throw new Exception(string.Format("Tela incorreta. Esperado: 'Lançamento de Itens', Atual: '{0}'", screen));
                }

                UpdateAlterdataStatus("Conectado");
                AutomationEngine.ForceForegroundWindow(hWnd);
                Thread.Sleep(300);

                if (screen == "Desconhecido")
                {
                    LogSafe("[AVISO] Não foi possível certificar o título da tela do Alterdata, mas prosseguindo com a tentativa de envio.", ColorLedOrange);
                }

                bool hadFailures;
                bool ok = AutomationEngine.ExecutePedidoFlow(screenRoot, hWnd, data, delegate(string msg) {
                    LogSafe(msg, ColorTextMuted);
                }, out hadFailures);

                if (hadFailures)
                {
                    LogSafe("[ERRO] Um ou mais campos do pedido NÃO foram confirmados corretamente pelo motor de automação. O texto pode ter ido para o campo errado — confira a tela do Alterdata antes de prosseguir.", ColorLedRed);
                }
                else if (ok)
                {
                    LogSafe("[SUCESSO] Todos os itens do pedido foram enviados com sucesso ao Alterdata!", ColorLedGreen);
                }
                else
                {
                    LogSafe("[AVISO] Nenhum item foi inserido. Verifique os campos.", ColorLedOrange);
                }
            }
        }

        // Alternativa ao preenchimento automático: só reorganiza as janelas do Alterdata e do
        // navegador lado a lado, sem tocar em foco/teclado nenhum -- o operador digita manualmente.
        // De propósito NÃO mexe na janela do Alterdata (nem procura, nem move) -- em alguns
        // PCs (ex.: Alterdata rodando como administrador enquanto o bridge roda sem elevação)
        // isso falhava com erro. O único objetivo aqui é o Painel de Referência nunca ficar
        // escondido, o que não depende do Alterdata de forma nenhuma.
        private void ProcessPinPanelFlow()
        {
            LogSafe("Processando pedido para fixar o Painel de Referência...", ColorAccent);

            IntPtr popupHwnd;
            bool ok = AutomationEngine.PinReferencePanel(delegate(string msg) {
                LogSafe(msg, ColorTextMuted);
            }, out popupHwnd);

            if (ok)
            {
                LogSafe("[SUCESSO] Painel de Referência fixado sempre visível.", ColorLedGreen);
            }
            else
            {
                LogSafe("[AVISO] Não foi possível fixar o Painel de Referência.", ColorLedOrange);
            }

            if (popupHwnd != IntPtr.Zero)
            {
                this.BeginInvoke((MethodInvoker)delegate {
                    StartTopmostEnforcer(popupHwnd);
                });
            }
        }

        // Cria (na primeira vez) e (re)inicia o timer que reforça HWND_TOPMOST no Painel de
        // Referência a cada 1,2s. Precisa rodar na UI thread -- é aí que o Timer do WinForms
        // dispara seus ticks, e ProcessPinPanelFlow roda numa thread do HttpListener.
        private void StartTopmostEnforcer(IntPtr popupHwnd)
        {
            _painelReferenciaHwnd = popupHwnd;

            if (_topmostEnforcerTimer == null)
            {
                _topmostEnforcerTimer = new System.Windows.Forms.Timer();
                _topmostEnforcerTimer.Interval = 1200;
                _topmostEnforcerTimer.Tick += TopmostEnforcerTimer_Tick;
            }

            _topmostEnforcerTimer.Start();
        }

        private void TopmostEnforcerTimer_Tick(object sender, EventArgs e)
        {
            if (_painelReferenciaHwnd == IntPtr.Zero || !AutomationEngine.IsWindowOpen(_painelReferenciaHwnd))
            {
                // O usuário fechou o painel (clicou no X dele) -- para de reforçar.
                _topmostEnforcerTimer.Stop();
                _painelReferenciaHwnd = IntPtr.Zero;
                return;
            }

            AutomationEngine.ReassertTopmost(_painelReferenciaHwnd);
        }

        private void VerifyAlterdataStatus(bool forceLog)
        {
            bool isSim;
            IntPtr hWnd = AutomationEngine.FindAlterdataWindow("cliente", out isSim);
            if (hWnd == IntPtr.Zero)
            {
                hWnd = AutomationEngine.FindAlterdataWindow("pedido", out isSim);
            }

            if (hWnd == IntPtr.Zero || (isSim && (_simulator == null || _simulator.IsDisposed || !_simulator.Visible)))
            {
                UpdateAlterdataStatus("Não Encontrado");
                if (forceLog) LogSafe("Alterdata não encontrado nos processos ativos.", ColorLedRed);
                return;
            }

            var root = AutomationEngine.GetWindowElement(hWnd);
            if (root == null)
            {
                UpdateAlterdataStatus("Não Encontrado");
                return;
            }

            System.Windows.Automation.AutomationElement screenRoot;
            string screen = AutomationEngine.DetectActiveScreen(root, out screenRoot);
            if (screen == "Cadastro de Cliente" || screen == "Lançamento de Itens")
            {
                UpdateAlterdataStatus("Conectado");
                if (forceLog) LogSafe(string.Format("Conectado com sucesso ao Alterdata! Tela ativa: {0}", screen), ColorLedGreen);
            }
            else
            {
                UpdateAlterdataStatus("Tela Incorreta");
                if (forceLog) LogSafe(string.Format("Alterdata encontrado, mas a tela ativa '{0}' não é suportada.", screen), ColorLedOrange);
            }
        }

        private void UpdateAlterdataStatus(string state)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke((MethodInvoker)delegate { UpdateAlterdataStatus(state); });
                return;
            }

            _alterdataState = state;
            lblAlterdataStatusText.Text = state;
            pbAlterdataLed.Invalidate();
        }

        // --- BUTTON CLICKS ---

        private void BtnDetect_Click(object sender, EventArgs e)
        {
            LogSafe("Forçando varredura de processos do Alterdata...", ColorTextMuted);
            VerifyAlterdataStatus(true);
        }

        private void BtnSimulator_Click(object sender, EventArgs e)
        {
            if (_simulator == null || _simulator.IsDisposed)
            {
                _simulator = new SimulatorForm();
            }

            if (!_simulator.Visible)
            {
                _simulator.Show();
                LogSafe("Simulador do Alterdata Nota Fácil aberto. Use esta tela para simular preenchimentos locais.", ColorLedGreen);
                VerifyAlterdataStatus(false);
            }
            else
            {
                _simulator.Focus();
            }
        }

        private void BtnTest_Click(object sender, EventArgs e)
        {
            Thread testThread = new Thread(RunQuickTest);
            testThread.IsBackground = true;
            testThread.Start();
        }

        private void BtnSendManualCliente_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(txtTestNome.Text))
            {
                MessageBox.Show("Por favor, informe o Nome/Razão Social para testar.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var data = new Dictionary<string, object>
            {
                { "tipo", "cliente" },
                { "nome", txtTestNome.Text },
                { "cpf", txtTestCPF.Text },
                { "cep", txtTestCEP.Text },
                { "endereco", txtTestEndereco.Text },
                { "numero", txtTestNumero.Text },
                { "complemento", "" },
                { "bairro", txtTestBairro.Text },
                { "cidade", txtTestCidade.Text },
                { "uf", txtTestUF.Text },
                { "celular", txtTestCelular.Text },
                { "telefone", "" }
            };

            Thread automationThread = new Thread(delegate() {
                try
                {
                    ProcessAutomationFlow(data, "cliente");
                }
                catch (Exception ex)
                {
                    LogSafe("Erro no envio manual de cliente: " + ex.Message, ColorLedRed);
                }
            });
            automationThread.IsBackground = true;
            automationThread.Start();
        }

        private void BtnSendManualPedido_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(txtTestPedProduto.Text))
            {
                MessageBox.Show("Por favor, informe o Código do Produto para testar.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var orderData = new Dictionary<string, object>
            {
                { "tipo", "pedido" },
                { "cliente", txtTestPedCliente.Text },
                { "produtos", new object[]
                    {
                        new Dictionary<string, object>
                        {
                            { "codigo", txtTestPedProduto.Text },
                            { "quantidade", txtTestPedQtd.Text },
                            { "desconto", txtTestPedDesc.Text },
                            { "valor", txtTestPedValor.Text }
                        }
                    }
                }
            };

            Thread automationThread = new Thread(delegate() {
                try
                {
                    ProcessAutomationFlow(orderData, "pedido");
                }
                catch (Exception ex)
                {
                    LogSafe("Erro no envio manual de pedido: " + ex.Message, ColorLedRed);
                }
            });
            automationThread.IsBackground = true;
            automationThread.Start();
        }

        private void RunQuickTest()
        {
            LogSafe("--- INICIANDO TESTE RÁPIDO DO MOTOR ---", ColorAccent);

            bool simulatorWasClosed = false;
            this.Invoke((MethodInvoker)delegate
            {
                if (_simulator == null || _simulator.IsDisposed || !_simulator.Visible)
                {
                    BtnSimulator_Click(this, EventArgs.Empty);
                    simulatorWasClosed = true;
                    _simulator.ClearAll();
                }
            });

            if (simulatorWasClosed)
            {
                Thread.Sleep(800);
            }

            try
            {
                LogSafe("1. Simulando recebimento de dados de CLIENTE...", ColorText);
                var clientData = new Dictionary<string, object>
                {
                    { "tipo", "cliente" },
                    { "nome", "Ana Júlia de Oliveira" },
                    { "cpf", "987.654.321-00" },
                    { "cep", "45602-030" },
                    { "endereco", "Avenida Beira Rio" },
                    { "numero", "740" },
                    { "complemento", "Apartamento 302" },
                    { "bairro", "Guanabara" },
                    { "cidade", "Itabuna" },
                    { "uf", "BA" },
                    { "celular", "(73) 98888-7777" },
                    { "telefone", "(73) 3211-1234" }
                };

                this.Invoke((MethodInvoker)delegate
                {
                    TabControl tab = (TabControl)_simulator.Controls["tabControlSim"];
                    tab.SelectedIndex = 0;
                });
                Thread.Sleep(500);

                ProcessAutomationFlow(clientData, "cliente");

                Thread.Sleep(2000);

                LogSafe("2. Simulando recebimento de dados de PEDIDO...", ColorText);
                var orderData = new Dictionary<string, object>
                {
                    { "tipo", "pedido" },
                    { "cliente", "Ana Júlia de Oliveira" },
                    { "produtos", new object[]
                        {
                            new Dictionary<string, object>
                            {
                                { "codigo", "100258" },
                                { "quantidade", "3" },
                                { "desconto", "10" },
                                { "valor", "45,50" }
                            },
                            new Dictionary<string, object>
                            {
                                { "codigo", "200789" },
                                { "quantidade", "1" },
                                { "desconto", "0" },
                                { "valor", "120,00" }
                            }
                        }
                    }
                };

                this.Invoke((MethodInvoker)delegate
                {
                    TabControl tab = (TabControl)_simulator.Controls["tabControlSim"];
                    tab.SelectedIndex = 1;
                });
                Thread.Sleep(500);

                ProcessAutomationFlow(orderData, "pedido");

                LogSafe("--- TESTE RÁPIDO FINALIZADO COM SUCESSO ---", ColorLedGreen);
            }
            catch (Exception ex)
            {
                LogSafe(string.Format("--- FALHA NO TESTE: {0} ---", ex.Message), ColorLedRed);
            }
        }

        // --- THREAD-SAFE LOGGING ---

        public void LogSafe(string message, Color color)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke((MethodInvoker)delegate { LogSafe(message, color); });
                return;
            }

            string timestamp = string.Format("[{0}] ", DateTime.Now.ToString("HH:mm:ss"));
            
            rtfLog.SelectionStart = rtfLog.TextLength;
            rtfLog.SelectionLength = 0;
            rtfLog.SelectionColor = ColorTextMuted;
            rtfLog.AppendText(timestamp);

            rtfLog.SelectionStart = rtfLog.TextLength;
            rtfLog.SelectionLength = 0;
            rtfLog.SelectionColor = color;
            rtfLog.AppendText(message + Environment.NewLine);

            rtfLog.ScrollToCaret();
        }

        private bool IsRunningOnStartup()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", false))
                {
                    if (key != null)
                    {
                        object value = key.GetValue("CentralSyncBridge");
                        return value != null && value.ToString() == Application.ExecutablePath;
                    }
                }
            }
            catch (Exception ex)
            {
                LogSafe("Erro ao verificar inicialização automática: " + ex.Message, ColorLedRed);
            }
            return false;
        }

        private void ChkStartup_CheckedChanged(object sender, EventArgs e)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (key != null)
                    {
                        if (chkStartup.Checked)
                        {
                            key.SetValue("CentralSyncBridge", Application.ExecutablePath);
                            LogSafe("Autostart: Habilitado (Iniciará com o Windows).", ColorText);
                        }
                        else
                        {
                            key.DeleteValue("CentralSyncBridge", false);
                            LogSafe("Autostart: Desabilitado.", ColorTextMuted);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao configurar inicialização automática: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                // Reverter estado do checkbox
                chkStartup.CheckedChanged -= ChkStartup_CheckedChanged;
                chkStartup.Checked = !chkStartup.Checked;
                chkStartup.CheckedChanged += ChkStartup_CheckedChanged;
            }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                DialogResult res = MessageBox.Show(
                    "Você está fechando a Ponte de Automação (CentralSync Bridge).\n\n" +
                    "Ao fechar este aplicativo, a integração com o Alterdata deixará de funcionar e os faturamentos do sistema web falharão.\n\n" +
                    "Deseja realmente fechar o programa?",
                    "Aviso de Fechamento",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning,
                    MessageBoxDefaultButton.Button2
                );

                if (res == DialogResult.No)
                {
                    e.Cancel = true;
                    return;
                }
            }

            if (_server != null)
            {
                _server.Stop();
            }

            if (_processCheckTimer != null)
            {
                _processCheckTimer.Stop();
            }

            if (_topmostEnforcerTimer != null)
            {
                _topmostEnforcerTimer.Stop();
            }

            if (_simulator != null && !_simulator.IsDisposed)
            {
                _simulator.Close();
            }
        }
    }
}
