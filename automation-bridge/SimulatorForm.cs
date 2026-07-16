using System;
using System.Drawing;
using System.Windows.Forms;

namespace CentralSyncBridge
{
    public class SimulatorForm : Form
    {
        private TabControl tabControl;
        private TabPage tabCliente;
        private TabPage tabItens;

        // --- Controles de Cliente ---
        public TextBox txtNome;
        public TextBox txtCPF;
        public TextBox txtCEP;
        public TextBox txtEndereco;
        public TextBox txtNumero;
        public TextBox txtComplemento;
        public TextBox txtBairro;
        public TextBox txtCidade;
        public TextBox txtUF;
        public TextBox txtCelular;
        public TextBox txtTelefone;

        // --- Controles de Pedido/Itens ---
        public TextBox txtCliente;
        public TextBox txtProduto;
        public TextBox txtQuantidade;
        public TextBox txtDesconto;
        public TextBox txtValor;
        private Button btnAdicionarItem;
        private ListBox lstItensAdicionados;

        public SimulatorForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.tabControl = new TabControl();
            this.tabCliente = new TabPage();
            this.tabItens = new TabPage();

            // Config Form
            this.Text = "Simulador Alterdata Nota Fácil - Ambiente de Teste";
            this.Size = new Size(550, 480);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(240, 240, 243);

            // Tab Control
            this.tabControl.Dock = DockStyle.Fill;
            this.tabControl.Location = new Point(0, 0);
            this.tabControl.Name = "tabControlSim";
            this.tabControl.SelectedIndex = 0;

            // --- TAB CLIENTE ---
            this.tabCliente.Text = "Cadastro de Cliente";
            this.tabCliente.BackColor = Color.White;
            this.tabCliente.Padding = new Padding(15);

            int startY = 20;
            int gapY = 32;
            int lblX = 20;
            int txtX = 160;
            int txtW = 320;

            // Rótulos e TextBoxes
            AddClienteField("Nome/Razão Social:", ref txtNome, "txtNome", lblX, txtX, startY + (gapY * 0), txtW);
            AddClienteField("CPF:", ref txtCPF, "txtCPF", lblX, txtX, startY + (gapY * 1), 180);
            AddClienteField("CEP:", ref txtCEP, "txtCEP", lblX, txtX, startY + (gapY * 2), 120);
            AddClienteField("Endereço:", ref txtEndereco, "txtEndereco", lblX, txtX, startY + (gapY * 3), txtW);
            AddClienteField("Número:", ref txtNumero, "txtNumero", lblX, txtX, startY + (gapY * 4), 80);
            AddClienteField("Complemento:", ref txtComplemento, "txtComplemento", lblX, txtX, startY + (gapY * 5), 180);
            AddClienteField("Bairro:", ref txtBairro, "txtBairro", lblX, txtX, startY + (gapY * 6), 200);
            AddClienteField("Cidade:", ref txtCidade, "txtCidade", lblX, txtX, startY + (gapY * 7), 200);
            AddClienteField("UF:", ref txtUF, "txtUF", lblX, txtX, startY + (gapY * 8), 60);
            AddClienteField("Celular:", ref txtCelular, "txtCelular", lblX, txtX, startY + (gapY * 9), 150);
            AddClienteField("Telefone:", ref txtTelefone, "txtTelefone", lblX, txtX, startY + (gapY * 10), 150);

            // --- TAB ITENS ---
            this.tabItens.Text = "Lançamento de Itens";
            this.tabItens.BackColor = Color.White;
            this.tabItens.Padding = new Padding(15);

            int pY = 20;
            // Campo Cliente
            Label lblCli = new Label { Text = "Cliente:", Location = new Point(lblX, pY), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            this.txtCliente = new TextBox { Name = "txtCliente", Location = new Point(txtX, pY), Width = txtW, Font = new Font("Segoe UI", 9) };
            this.tabItens.Controls.AddRange(new Control[] { lblCli, this.txtCliente });

            pY += 45;

            // Grupo Lançamento de Itens
            GroupBox grpItens = new GroupBox { Text = "Lançamento de Produto", Location = new Point(15, pY), Size = new Size(500, 160), Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            grpItens.ForeColor = Color.FromArgb(40, 40, 50);

            int gpY = 25;
            // Produto
            Label lblProd = new Label { Text = "Produto:", Location = new Point(15, gpY + 3), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Regular) };
            this.txtProduto = new TextBox { Name = "txtProduto", Location = new Point(100, gpY), Width = 150, Font = new Font("Segoe UI", 9, FontStyle.Regular) };
            
            // Quantidade
            Label lblQtd = new Label { Text = "Quantidade:", Location = new Point(270, gpY + 3), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Regular) };
            this.txtQuantidade = new TextBox { Name = "txtQuantidade", Location = new Point(370, gpY), Width = 100, Font = new Font("Segoe UI", 9, FontStyle.Regular), Text = "1" };

            gpY += 35;

            // Desconto
            Label lblDesc = new Label { Text = "Desconto:", Location = new Point(15, gpY + 3), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Regular) };
            this.txtDesconto = new TextBox { Name = "txtDesconto", Location = new Point(100, gpY), Width = 150, Font = new Font("Segoe UI", 9, FontStyle.Regular), Text = "0" };

            // Valor
            Label lblVal = new Label { Text = "Valor:", Location = new Point(270, gpY + 3), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Regular) };
            this.txtValor = new TextBox { Name = "txtValor", Location = new Point(370, gpY), Width = 100, Font = new Font("Segoe UI", 9, FontStyle.Regular) };

            gpY += 40;

            // Botão Adicionar
            this.btnAdicionarItem = new Button
            {
                Text = "Adicionar Item (Enter)",
                Location = new Point(100, gpY),
                Width = 370,
                Height = 30,
                FlatStyle = FlatStyle.System,
                Font = new Font("Segoe UI", 9, FontStyle.Bold)
            };
            this.btnAdicionarItem.Click += BtnAdicionarItem_Click;

            grpItens.Controls.AddRange(new Control[] {
                lblProd, this.txtProduto,
                lblQtd, this.txtQuantidade,
                lblDesc, this.txtDesconto,
                lblVal, this.txtValor,
                this.btnAdicionarItem
            });
            this.tabItens.Controls.Add(grpItens);

            pY += 175;

            // Lista de Itens Lançados
            Label lblList = new Label { Text = "Itens Lançados na Nota:", Location = new Point(15, pY), AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            this.lstItensAdicionados = new ListBox
            {
                Location = new Point(15, pY + 20),
                Size = new Size(500, 100),
                Font = new Font("Consolas", 9),
                BackColor = Color.FromArgb(245, 245, 248)
            };
            
            this.tabItens.Controls.AddRange(new Control[] { lblList, this.lstItensAdicionados });

            // Adicionar Tabs
            this.tabControl.Controls.Add(this.tabCliente);
            this.tabControl.Controls.Add(this.tabItens);
            this.Controls.Add(this.tabControl);

            // Evento para capturar tecla Enter na tela de itens e acionar o botão de adicionar
            this.KeyPreview = true;
            this.KeyDown += SimulatorForm_KeyDown;
        }

        private void AddClienteField(string labelText, ref TextBox txt, string txtName, int xLabel, int xTxt, int y, int width)
        {
            Label lbl = new Label
            {
                Text = labelText,
                Location = new Point(xLabel, y + 3),
                AutoSize = true,
                Font = new Font("Segoe UI", 9)
            };
            txt = new TextBox
            {
                Name = txtName,
                Location = new Point(xTxt, y),
                Width = width,
                Font = new Font("Segoe UI", 9)
            };
            this.tabCliente.Controls.AddRange(new Control[] { lbl, txt });
        }

        private void SimulatorForm_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter && tabControl.SelectedTab == tabItens)
            {
                BtnAdicionarItem_Click(sender, e);
                e.Handled = true;
                e.SuppressKeyPress = true;
            }
        }

        private void BtnAdicionarItem_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(txtProduto.Text))
            {
                MessageBox.Show("Por favor, preencha o código do produto no simulador.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string itemDesc = string.Format("PROD: {0,-10} | QTD: {1,-5} | DESC: {2,-5} | VAL: {3,-8}",
                txtProduto.Text,
                txtQuantidade.Text,
                txtDesconto.Text,
                string.IsNullOrEmpty(txtValor.Text) ? "Auto" : txtValor.Text);

            lstItensAdicionados.Items.Add(itemDesc);

            // Limpar campos de entrada do produto para o próximo
            txtProduto.Text = "";
            txtQuantidade.Text = "1";
            txtDesconto.Text = "0";
            txtValor.Text = "";
            txtProduto.Focus();
        }

        public void ClearAll()
        {
            txtNome.Text = "";
            txtCPF.Text = "";
            txtCEP.Text = "";
            txtEndereco.Text = "";
            txtNumero.Text = "";
            txtComplemento.Text = "";
            txtBairro.Text = "";
            txtCidade.Text = "";
            txtUF.Text = "";
            txtCelular.Text = "";
            txtTelefone.Text = "";

            txtCliente.Text = "";
            txtProduto.Text = "";
            txtQuantidade.Text = "1";
            txtDesconto.Text = "0";
            txtValor.Text = "";
            lstItensAdicionados.Items.Clear();
        }
    }
}
