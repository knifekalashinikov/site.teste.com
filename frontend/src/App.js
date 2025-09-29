import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "@/App.css";

// Components imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Icons
import { Instagram, Star, Clock, Users, Shield, Zap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Component
const AdminPanel = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-500",
      paid: "bg-blue-500",
      processing: "bg-purple-500", 
      completed: "bg-green-500",
      cancelled: "bg-red-500"
    };
    
    const labels = {
      pending: "Pendente",
      paid: "Pago",
      processing: "Processando",
      completed: "Completo",
      cancelled: "Cancelado"
    };

    return (
      <Badge className={`${colors[status] || "bg-gray-500"} text-white`}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold">Painel Administrativo</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Total Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.total_orders || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Pedidos Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{stats.pending_orders || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Pedidos Completos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats.completed_orders || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">R$ {(stats.total_revenue || 0).toFixed(2).replace('.', ',')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">Pedidos</CardTitle>
            <CardDescription className="text-gray-400">
              Gerencie todos os pedidos de seguidores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                <p className="mt-4 text-gray-400">Carregando pedidos...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-300">ID</th>
                      <th className="text-left p-2 text-gray-300">Cliente</th>
                      <th className="text-left p-2 text-gray-300">Instagram</th>
                      <th className="text-left p-2 text-gray-300">Pacote</th>
                      <th className="text-left p-2 text-gray-300">Valor</th>
                      <th className="text-left p-2 text-gray-300">Status</th>
                      <th className="text-left p-2 text-gray-300">Data</th>
                      <th className="text-left p-2 text-gray-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="p-2">
                          <span className="font-mono text-xs text-gray-400">
                            {order.id.substring(0, 8)}...
                          </span>
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="text-white font-medium">{order.customer_name}</div>
                            <div className="text-xs text-gray-400">{order.customer_email}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-purple-400">@{order.instagram_username}</span>
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="text-white">{order.package_name}</div>
                            <div className="text-xs text-gray-400">{order.package_quantity.toLocaleString()} seguidores</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-green-400 font-medium">
                            R$ {order.package_price.toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="p-2">{getStatusBadge(order.status)}</td>
                        <td className="p-2">
                          <span className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td className="p-2">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-purple-500"
                          >
                            <option value="pending">Pendente</option>
                            <option value="paid">Pago</option>
                            <option value="processing">Processando</option>
                            <option value="completed">Completo</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {orders.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Nenhum pedido encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    instagram_username: "",
    package_id: ""
  });
  const [orderResult, setOrderResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages`);
      setPackages(response.data);
    } catch (error) {
      console.error("Erro ao buscar pacotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await axios.post(`${API}/orders`, {
        ...orderForm,
        package_id: selectedPackage.id
      });
      setOrderResult(response.data);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOrderDialog = (pkg) => {
    setSelectedPackage(pkg);
    setOrderForm(prev => ({ ...prev, package_id: pkg.id }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-black/40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                <Instagram className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-300 to-white bg-clip-text text-transparent mb-6">
              InstaGrow
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Acelere seu crescimento no Instagram com <span className="text-purple-400 font-semibold">seguidores reais brasileiros</span>
            </p>
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm">100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">Entrega Rápida</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-sm">Seguidores Reais</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha seu Pacote de Crescimento
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Nossos pacotes são 100% brasileiros e começam a ser entregues imediatamente após a confirmação do pagamento
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Carregando pacotes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative bg-gradient-to-b from-gray-900 to-black border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 ${
                  pkg.popular ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700 hover:border-purple-400'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-bold text-white">{pkg.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm">{pkg.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                      R$ {pkg.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-gray-400 text-sm">para {pkg.quantity.toLocaleString()} seguidores</div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 mb-4 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{pkg.delivery_time}</span>
                  </div>
                  
                  <Separator className="bg-gray-700 mb-4" />
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                        onClick={() => openOrderDialog(pkg)}
                      >
                        Comprar Agora
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center mb-2">
                          Finalizar Pedido
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400">
                          {selectedPackage?.name} - R$ {selectedPackage?.price.toFixed(2).replace('.', ',')}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {!orderResult ? (
                        <form onSubmit={handleOrderSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="customer_name" className="text-white">Nome Completo</Label>
                            <Input
                              id="customer_name"
                              type="text"
                              value={orderForm.customer_name}
                              onChange={(e) => setOrderForm(prev => ({...prev, customer_name: e.target.value}))}
                              className="bg-gray-800 border-gray-600 text-white focus:border-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="customer_email" className="text-white">E-mail</Label>
                            <Input
                              id="customer_email"
                              type="email"
                              value={orderForm.customer_email}
                              onChange={(e) => setOrderForm(prev => ({...prev, customer_email: e.target.value}))}
                              className="bg-gray-800 border-gray-600 text-white focus:border-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="customer_phone" className="text-white">Telefone</Label>
                            <Input
                              id="customer_phone"
                              type="tel"
                              value={orderForm.customer_phone}
                              onChange={(e) => setOrderForm(prev => ({...prev, customer_phone: e.target.value}))}
                              className="bg-gray-800 border-gray-600 text-white focus:border-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="instagram_username" className="text-white">Nome de usuário do Instagram</Label>
                            <Input
                              id="instagram_username"
                              type="text"
                              placeholder="@seuusuario"
                              value={orderForm.instagram_username}
                              onChange={(e) => setOrderForm(prev => ({...prev, instagram_username: e.target.value}))}
                              className="bg-gray-800 border-gray-600 text-white focus:border-purple-500"
                              required
                            />
                            <p className="text-xs text-gray-400 mt-1">Digite sem o @ (será removido automaticamente)</p>
                          </div>
                          
                          <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg"
                          >
                            {isSubmitting ? "Processando..." : "Gerar PIX"}
                          </Button>
                        </form>
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                            <h3 className="text-green-400 font-semibold mb-2">Pedido Criado com Sucesso!</h3>
                            <p className="text-sm text-gray-300">ID do Pedido: {orderResult.id}</p>
                          </div>
                          
                          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-2">Código PIX:</h4>
                            <div className="bg-black p-3 rounded text-xs font-mono text-green-400 break-all">
                              {orderResult.pix_code}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Copie este código e use no seu app de pagamentos para pagar via PIX
                            </p>
                          </div>
                          
                          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                            <p className="text-blue-400 text-sm">
                              Após o pagamento, os seguidores serão entregues em {selectedPackage?.delivery_time}
                            </p>
                          </div>
                          
                          <Button 
                            onClick={() => {setOrderResult(null); setOrderForm({customer_name: "", customer_email: "", customer_phone: "", instagram_username: "", package_id: ""});}}
                            className="w-full bg-gray-700 hover:bg-gray-600"
                          >
                            Novo Pedido
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 InstaGrow - Todos os direitos reservados
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Crescimento orgânico e seguro para seu perfil do Instagram
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
