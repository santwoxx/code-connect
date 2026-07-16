using System;
using System.Windows.Forms;
using System.Diagnostics;

namespace CentralSyncBridge
{
    static class Program
    {
        /// <summary>
        /// O ponto de entrada principal para o aplicativo.
        /// </summary>
        [STAThread]
        static void Main()
        {
            // Evitar múltiplas instâncias da ponte rodando juntas
            string processName = Process.GetCurrentProcess().ProcessName;
            Process[] instances = Process.GetProcessesByName(processName);
            if (instances.Length > 1)
            {
                // Já existe outra instância rodando
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
