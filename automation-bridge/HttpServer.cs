using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Collections.Generic;

namespace CentralSyncBridge
{
    public class HttpServer
    {
        private HttpListener _listener;
        private Thread _listenerThread;
        private bool _isRunning;
        private readonly int _port;
        private readonly JavaScriptSerializer _serializer;

        // Eventos para notificar a interface
        public event Action<string> OnLog;
        public event Action<Dictionary<string, object>> OnClientReceived;
        public event Action<Dictionary<string, object>> OnOrderReceived;
        public event Action<Dictionary<string, object>> OnArrangeWindowsRequested;

        public HttpServer(int port = 7878)
        {
            _port = port;
            _serializer = new JavaScriptSerializer();
        }

        public void Start()
        {
            if (_isRunning) return;

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add(string.Format("http://localhost:{0}/", _port));
                _listener.Start();

                _isRunning = true;
                _listenerThread = new Thread(ListenLoop);
                _listenerThread.IsBackground = true;
                _listenerThread.Name = "HttpServerListener";
                _listenerThread.Start();

                Log(string.Format("Servidor HTTP iniciado com sucesso na porta {0}.", _port));
            }
            catch (Exception ex)
            {
                Log(string.Format("ERRO ao iniciar o servidor: {0}", ex.Message));
            }
        }

        public void Stop()
        {
            if (!_isRunning) return;

            _isRunning = false;
            try
            {
                if (_listener != null)
                {
                    _listener.Stop();
                    _listener.Close();
                }
            }
            catch { }

            if (_listenerThread != null)
            {
                _listenerThread.Join(1000);
            }
            Log("Servidor HTTP parado.");
        }

        private void ListenLoop()
        {
            while (_isRunning)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch (HttpListenerException)
                {
                    // Ocorre quando o listener é parado
                    break;
                }
                catch (Exception ex)
                {
                    Log(string.Format("Erro no loop de escuta: {0}", ex.Message));
                }
            }
        }

        private void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            // Habilitar CORS
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            // Tratar requisição OPTIONS (Preflight)
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = (int)HttpStatusCode.OK;
                response.Close();
                return;
            }

            if (request.HttpMethod != "POST")
            {
                SendJsonError(response, HttpStatusCode.MethodNotAllowed, "Apenas requisições POST são suportadas.");
                return;
            }

            try
            {
                string json;
                using (var reader = new StreamReader(request.InputStream, System.Text.Encoding.UTF8))
                {
                    json = reader.ReadToEnd();
                }

                Log(string.Format("Requisição recebida de {0}", request.RemoteEndPoint));

                var data = _serializer.Deserialize<Dictionary<string, object>>(json);
                if (data == null || !data.ContainsKey("tipo"))
                {
                    SendJsonError(response, HttpStatusCode.BadRequest, "JSON inválido ou campo 'tipo' ausente.");
                    return;
                }

                string tipo = data["tipo"].ToString().ToLower();

                if (tipo == "cliente")
                {
                    Log("JSON de Cliente recebido com sucesso.");
                    if (OnClientReceived != null)
                    {
                        OnClientReceived(data);
                    }
                    SendJsonSuccess(response, "Dados de cliente recebidos e processados.");
                }
                else if (tipo == "pedido")
                {
                    Log("JSON de Pedido recebido com sucesso.");
                    if (OnOrderReceived != null)
                    {
                        OnOrderReceived(data);
                    }
                    SendJsonSuccess(response, "Dados de pedido recebidos e processados.");
                }
                else if (tipo == "organizar")
                {
                    Log("Pedido de organização de janelas recebido.");
                    if (OnArrangeWindowsRequested != null)
                    {
                        OnArrangeWindowsRequested(data);
                    }
                    SendJsonSuccess(response, "Janelas organizadas.");
                }
                else
                {
                    SendJsonError(response, HttpStatusCode.BadRequest, string.Format("Tipo '{0}' desconhecido. Use 'cliente', 'pedido' ou 'organizar'.", tipo));
                }
            }
            catch (Exception ex)
            {
                Log(string.Format("Erro ao processar requisição JSON: {0}", ex.Message));
                SendJsonError(response, HttpStatusCode.InternalServerError, string.Format("Erro interno: {0}", ex.Message));
            }
        }

        private void SendJsonSuccess(HttpListenerResponse response, string message)
        {
            try
            {
                var result = new Dictionary<string, object>
                {
                    { "sucesso", true },
                    { "mensagem", message }
                };

                string jsonResponse = _serializer.Serialize(result);
                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);

                response.ContentType = "application/json; charset=utf-8";
                response.ContentLength64 = buffer.Length;
                response.StatusCode = (int)HttpStatusCode.OK;
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Log(string.Format("Erro ao enviar resposta de sucesso: {0}", ex.Message));
            }
            finally
            {
                try { response.Close(); } catch { }
            }
        }

        private void SendJsonError(HttpListenerResponse response, HttpStatusCode statusCode, string errorMessage)
        {
            try
            {
                var result = new Dictionary<string, object>
                {
                    { "sucesso", false },
                    { "erro", errorMessage }
                };

                string jsonResponse = _serializer.Serialize(result);
                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);

                response.ContentType = "application/json; charset=utf-8";
                response.ContentLength64 = buffer.Length;
                response.StatusCode = (int)statusCode;
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Log(string.Format("Erro ao enviar resposta de erro: {0}", ex.Message));
            }
            finally
            {
                try { response.Close(); } catch { }
            }
        }

        private void Log(string message)
        {
            if (OnLog != null)
            {
                OnLog(message);
            }
        }
    }
}
