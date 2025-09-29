from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum
import qrcode
from io import BytesIO
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="InstaGrow API", description="API para venda de seguidores do Instagram")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class PackageType(str, Enum):
    FOLLOWERS = "followers"
    LIKES = "likes"
    VIEWS = "views"
    COMMENTS = "comments"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Models
class Package(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: PackageType
    quantity: int
    price: float
    delivery_time: str  # ex: "1-3 dias"
    popular: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PackageCreate(BaseModel):
    name: str
    description: str
    type: PackageType
    quantity: int
    price: float
    delivery_time: str
    popular: bool = False

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: str
    customer_phone: str
    instagram_username: str
    package_id: str
    package_name: str
    package_quantity: int
    package_price: float
    status: OrderStatus = OrderStatus.PENDING
    pix_code: Optional[str] = None
    pix_qr_code: Optional[str] = None
    payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    instagram_username: str
    package_id: str

    @validator('instagram_username')
    def validate_instagram_username(cls, v):
        # Remove @ if present
        v = v.lstrip('@')
        if not v:
            raise ValueError('Nome de usuário do Instagram é obrigatório')
        return v

class OrderUpdate(BaseModel):
    status: OrderStatus

# Utility functions
def generate_pix_code(value: float, name: str, city: str = "São Paulo") -> str:
    """Gera código PIX simplificado (em produção usar gateway de pagamento real)"""
    import uuid
    payment_id = str(uuid.uuid4())[:8]
    # Em produção, integrar com gateway como Mercado Pago, PagSeguro, etc.
    return f"00020126580014BR.GOV.BCB.PIX013636{payment_id}5204000053039865802BR5925{name[:25]}6009{city[:15]}62070503***6304"

def generate_qr_code(pix_code: str) -> str:
    """Gera QR code do PIX em base64"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(pix_code)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Routes

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "InstaGrow API - Venda de Seguidores do Instagram", "version": "1.0"}

# Package routes
@api_router.get("/packages", response_model=List[Package])
async def get_packages():
    """Lista todos os pacotes disponíveis"""
    packages = await db.packages.find().to_list(1000)
    return [Package(**package) for package in packages]

@api_router.get("/packages/{package_id}", response_model=Package)
async def get_package(package_id: str):
    """Obtém um pacote específico"""
    package = await db.packages.find_one({"id": package_id})
    if not package:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return Package(**package)

@api_router.post("/packages", response_model=Package)
async def create_package(package: PackageCreate):
    """Cria um novo pacote (admin)"""
    package_dict = package.dict()
    package_obj = Package(**package_dict)
    await db.packages.insert_one(package_obj.dict())
    return package_obj

@api_router.put("/packages/{package_id}", response_model=Package)
async def update_package(package_id: str, package: PackageCreate):
    """Atualiza um pacote (admin)"""
    result = await db.packages.find_one_and_update(
        {"id": package_id},
        {"$set": package.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return Package(**result)

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str):
    """Remove um pacote (admin)"""
    result = await db.packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return {"message": "Pacote removido com sucesso"}

# Order routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    """Cria um novo pedido"""
    # Busca o pacote
    package = await db.packages.find_one({"id": order_data.package_id})
    if not package:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    
    # Gera código PIX
    pix_code = generate_pix_code(package["price"], order_data.customer_name)
    qr_code = generate_qr_code(pix_code)
    
    # Cria o pedido
    order_dict = order_data.dict()
    order_dict.update({
        "package_name": package["name"],
        "package_quantity": package["quantity"],
        "package_price": package["price"],
        "pix_code": pix_code,
        "pix_qr_code": qr_code,
        "payment_id": str(uuid.uuid4())[:8]
    })
    
    order_obj = Order(**order_dict)
    await db.orders.insert_one(order_obj.dict())
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    """Lista todos os pedidos (admin)"""
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Obtém um pedido específico"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return Order(**order)

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, update_data: OrderUpdate):
    """Atualiza status do pedido (admin)"""
    update_dict = update_data.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return Order(**result)

# Statistics routes for admin
@api_router.get("/admin/stats")
async def get_stats():
    """Estatísticas para o painel admin"""
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    completed_orders = await db.orders.count_documents({"status": "completed"})
    total_revenue = await db.orders.aggregate([
        {"$match": {"status": {"$in": ["paid", "processing", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$package_price"}}}
    ]).to_list(1)
    
    revenue = total_revenue[0]["total"] if total_revenue else 0
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_revenue": revenue
    }

# Initialize default packages
@api_router.post("/init-data")
async def initialize_data():
    """Inicializa dados padrão (executar apenas uma vez)"""
    # Verifica se já existem pacotes
    existing = await db.packages.count_documents({})
    if existing > 0:
        return {"message": "Dados já inicializados"}
    
    default_packages = [
        {
            "name": "100 Seguidores",
            "description": "Ideal para começar! 100 seguidores brasileiros de qualidade.",
            "type": "followers",
            "quantity": 100,
            "price": 9.90,
            "delivery_time": "1-2 horas",
            "popular": False
        },
        {
            "name": "500 Seguidores",
            "description": "Mais popular! 500 seguidores brasileiros ativos.",
            "type": "followers",
            "quantity": 500,
            "price": 29.90,
            "delivery_time": "2-6 horas",
            "popular": True
        },
        {
            "name": "1.000 Seguidores",
            "description": "Plano premium com 1.000 seguidores de alta qualidade.",
            "type": "followers",
            "quantity": 1000,
            "price": 49.90,
            "delivery_time": "6-12 horas",
            "popular": False
        },
        {
            "name": "2.500 Seguidores",
            "description": "Para quem quer crescer rápido! 2.500 seguidores reais.",
            "type": "followers",
            "quantity": 2500,
            "price": 99.90,
            "delivery_time": "12-24 horas",
            "popular": False
        },
        {
            "name": "5.000 Seguidores",
            "description": "Pacote profissional com 5.000 seguidores brasileiros.",
            "type": "followers",
            "quantity": 5000,
            "price": 179.90,
            "delivery_time": "24-48 horas",
            "popular": False
        }
    ]
    
    packages_to_insert = []
    for pkg_data in default_packages:
        pkg_obj = Package(**pkg_data)
        packages_to_insert.append(pkg_obj.dict())
    
    await db.packages.insert_many(packages_to_insert)
    return {"message": f"Inicializados {len(default_packages)} pacotes padrão"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
