/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const BRIDGE_URL = "http://localhost:7878/";

// Helper to inject a beautifully styled Toast notification into the DOM.
// This matches the look and feel of the CentralSync system.
function showGlobalToast(type: 'success' | 'error', message: string) {
  let container = document.getElementById('automation-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'automation-toast-container';
    container.className = 'fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none font-sans';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `min-w-[280px] text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 pointer-events-auto transition-all duration-300 transform translate-x-12 opacity-0 ${
    type === 'success' 
      ? 'bg-emerald-600 border border-emerald-500' 
      : 'bg-rose-600 border border-rose-500'
  }`;

  const icon = type === 'success' 
    ? `<svg class="w-4 h-4 text-emerald-100 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-4 h-4 text-rose-100 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation after append
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-12', 'opacity-0');
  });

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-12', 'opacity-0');
    setTimeout(() => {
      toast.remove();
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    }, 300);
  }, 5000);
}

/**
 * Generic function to post to the CentralSync Bridge local server.
 */
async function postToBridge(payload: any): Promise<{ sucesso: boolean; mensagem?: string; erro?: string }> {
  try {
    const response = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.erro || `Erro HTTP ${response.status}: ${response.statusText}`;
      showGlobalToast('error', `Falha na integração: ${errMsg}`);
      return { sucesso: false, erro: errMsg };
    }

    const data = await response.json();
    const isSuccess = data.sucesso !== false;
    
    if (isSuccess) {
      showGlobalToast('success', data.mensagem || "Dados integrados com sucesso!");
      return { sucesso: true, mensagem: data.mensagem };
    } else {
      showGlobalToast('error', data.erro || "A ponte retornou um erro ao processar os dados.");
      return { sucesso: false, erro: data.erro };
    }
  } catch (error) {
    console.error("Erro ao comunicar com a CentralSync Bridge:", error);
    const connectionError = "CentralSync Bridge fechado ou inacessível no computador. Abra o executável local para ativar a automação.";
    showGlobalToast('error', connectionError);
    return {
      sucesso: false,
      erro: connectionError,
    };
  }
}

/**
 * Sends a customer registration payload to the local bridge.
 */
export async function enviarClienteParaAlterdata(clienteDados: {
  nome?: string;
  cpf?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  celular?: string;
  tipo_pessoa?: "Física" | "Jurídica";
}) {
  const payload = {
    tipo: "cliente",
    ...clienteDados,
  };
  return postToBridge(payload);
}

/**
 * Sends an order payload (with items) to the local bridge.
 */
export async function enviarPedidoParaAlterdata(pedidoDados: {
  cliente: string;
  produtos: Array<{
    codigo: string;
    quantidade: number;
    desconto: number;
    valor: string; // Ex: "120,00"
  }>;
}) {
  const payload = {
    tipo: "pedido",
    ...pedidoDados,
  };
  return postToBridge(payload);
}

/**
 * Asks the local bridge to pin the floating reference panel window as
 * always-on-top, so it never gets hidden behind Alterdata -- no focus/
 * keystroke automation involved, and the Alterdata window itself is never
 * touched (some machines run Alterdata elevated, which blocks a
 * non-elevated process from moving its window).
 */
export async function fixarPainelSempreVisivel() {
  return postToBridge({ tipo: "organizar" });
}

const PAINEL_TITULO = "CentralSync — Painel de Referência";

interface PainelReferenciaDados {
  nome: string;
  cpf: string;
  celular?: string;
  cep: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  produto?: string;
  sku?: string;
  qtd?: string;
  valor?: string;
}

function renderPainelHtml(dados: PainelReferenciaDados): string {
  const linha = (label: string, value: string | undefined) => {
    const displayValue = value || 'Não informado';
    const copyButton = value ? `<button onclick="copyToClipboard(this, \`${value.replace(/`/g, '\\`')}\`)" class="copy-btn" title="Copiar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>` : '';
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.03em;margin-bottom:2px;">${label}</div>
        <div style="font-size:14px;font-weight:700;color:#0f172a;word-break:break-word;display:flex;align-items:center;gap:6px;">
          <span>${displayValue}</span>
          ${copyButton}
        </div>
      </div>`;
  };

  const ruaNumero = dados.endereco ? `${dados.endereco}${dados.numero ? `, ${dados.numero}` : ', s/nº'}` : '';
  const cidadeUf = dados.cidade ? `${dados.cidade}${dados.uf ? ` - ${dados.uf}` : ''}` : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${PAINEL_TITULO}</title>
<style>
  body{margin:0;padding:12px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;}
  h2{font-size:11px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;padding-top:8px;border-top:1px solid #e2e8f0;}
  h2:first-of-type{border-top:none;padding-top:0;margin-top:0;}
  .copy-btn { background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; padding: 4px; color: #475569; display: flex; align-items: center; justify-content: center; transition: background 0.1s; }
  .copy-btn:hover { background: #cbd5e1; color: #0f172a; }
  .copy-btn:active { background: #94a3b8; }
</style>
<script>
  function copyToClipboard(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
    }).catch(err => console.error('Erro ao copiar', err));
  }
</script>
</head>
<body>
  <h2>Cliente</h2>
  ${linha('Nome', dados.nome)}
  ${linha('CPF/CNPJ', dados.cpf)}
  ${linha('Celular', dados.celular)}
  ${linha('Endereço (Rua, Número)', ruaNumero)}
  ${dados.complemento ? linha('Complemento', dados.complemento) : ''}
  ${linha('Bairro', dados.bairro)}
  ${linha('Cidade - UF', cidadeUf)}
  ${linha('CEP', dados.cep)}
  ${dados.produto ? `<h2>Item do Pedido</h2>${linha('Produto', dados.produto)}${linha('SKU', dados.sku)}${linha('Quantidade', dados.qtd)}${linha('Valor Unitário', dados.valor)}` : ''}
</body></html>`;
}

/**
 * Opens (or reuses, if still open) a small floating popup window with the
 * client/order reference data, so the operator can read it while typing into
 * Alterdata. Pinning it "always on top" is handled separately by the bridge
 * via fixarPainelSempreVisivel(), once this popup exists to find. The
 * bridge never touches the Alterdata window itself.
 */
export function openFloatingReferencePanel(
  dados: PainelReferenciaDados,
  existing?: Window | null
): Window | null {
  const win = existing && !existing.closed ? existing : window.open(
    '',
    'centralsync_painel_referencia',
    `width=280,height=580,left=${Math.max(0, window.screen.availWidth - 300)},top=40,resizable=yes,scrollbars=yes`
  );

  if (!win) {
    showGlobalToast('error', 'Não foi possível abrir o Painel de Referência. Verifique se o navegador está bloqueando pop-ups.');
    return null;
  }

  win.document.open();
  win.document.write(renderPainelHtml(dados));
  win.document.close();
  win.focus();

  return win;
}
