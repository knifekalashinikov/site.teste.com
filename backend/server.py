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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
