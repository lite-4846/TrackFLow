# **TrackFlow - Web Analytics Platform**

## **Motive**

To build a **backend-heavy web analytics platform** like Google Analytics that focuses on:

- **Real-time event tracking**
- **High-throughput data processing**
- **Scalable storage**
- **Analytics visualization**

This project will serve as a **showcase of backend expertise** and **help in transitioning to a Senior Backend Developer role**.

---

## **Tech Stack**

### **Backend:**

- **NestJS** (for structured backend development)
- **Fastify Adapter** (for improved performance)
- **PostgreSQL** (for structured analytics storage (users/auth)) and **ClickHouse** (for high-performance analytics storage)
- **Kafka** (for event processing)
- **Redis** (for caching and performance optimization)
- **JWT Authentication** (using `@nestjs/jwt`)

### **Frontend:**

- **React (Vite)** (for showcasing React skills)
- **TailwindCSS** (for modern UI design)
- **Recharts/D3.js** (for analytics visualization)

### **Additional Tools:**

- **pnpm** (for faster package management)
- **Docker** (for containerization & deployment)
- **Nginx** (as a reverse proxy)

---

## **Development Phases**

1. **Tech Stack Decision** ✅ *(Done)*
2. **Backend Setup**
    - Initialize NestJS with Fastify
    - Set up authentication with JWT
    - Implement core services & controllers
3. **Database Setup**
    - Choose between PostgreSQL or ClickHouse
    - Define schema for tracking events
4. **SDK Development**
    - Create an SDK for client-side event tracking
    - Implement batching & optimized API calls
5. **Message Queue Integration**
    - Process high-volume events using Kafka/RabbitMQ
    - Optimize for scalability & reliability
6. **Backend Logic Implementation**
    - Build APIs for analytics queries
    - Implement caching with Redis
7. **Frontend Development**
    - Dashboard for displaying analytics
    - Real-time data visualization

---

## **Folder Structure (Tentative)**

```
trackflow/
├── backend/  (NestJS Backend)
│   ├── src/
│   │   ├── auth/  (Authentication Module)
│   │   ├── analytics/  (Core analytics logic)
│   │   ├── sdk/  (Client SDK handling)
│   │   ├── queue/  (Message Queue Processing)
│   │   ├── database/  (Database Models & Services)
│   │   ├── cache/  (Redis Integration)
│   │   ├── app.module.ts
│   │   ├── main.ts
│   ├── Dockerfile
│   ├── pnpm-lock.yaml
├── frontend/  (React + Vite Frontend)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
├── sdk/  (Client SDK for event tracking)
│   ├── src/
│   │   ├── index.ts
│   │   ├── tracker.ts
│   ├── package.json
├── docker-compose.yml
├── README.md
```

--- 