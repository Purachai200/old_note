# 📝 RealSync Notes & Checklist (Old Note)

> **Real-Time Notes & Interactive Checklist** designed for high-performance cross-device syncing, specifically engineered to work flawlessly on modern browsers AND legacy hardware like the **1st Generation iPad Mini running iOS 9.3.5 (Safari 9)**.

[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://www.docker.com/)
[![Dockge Compatible](https://img.shields.io/badge/Dockge-Ready-brightgreen)](https://dockge.kuma.pet/)
[![Vue 3 Legacy](https://img.shields.io/badge/Vue_3-iOS_9.3.5_Compatible-42b883?logo=vuedotjs)](https://vuejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57?logo=sqlite)](https://sqlite.org/)
[![RAM Usage](https://img.shields.io/badge/RAM_Usage-~50MB-success)]()

---

## 🌟 จุดเด่น (Key Highlights)

- ⚡ **Real-Time Cross-Device Sync**: พิมพ์โน้ต หรือติ๊ก Checkbox บนคอมพิวเตอร์ หน้าจอ iPad Mini จะอัปเดตแบบเรียลไทม์ทันทีโดยไม่ต้องรีเฟรช (ผ่าน Socket.io)
- 📱 **100% iPad Mini 1 (iOS 9.3.5 / Safari 9) Compatible**:
  - ทรานส์ไพล์ด้วย `@vitejs/plugin-legacy` รองรับ ES5 แบบสมบูรณ์
  - แก้ปัญหา CSS WebKit ยุคเก่า (ไม่ใช้ Flexbox `gap` และเลี่ยง CSS Variables ที่ Safari 9 ไม่รองรับ)
  - ขยาย Touch Targets ของ Checkbox เป็นขนาด $44 \times 44\text{ pt}$ เพื่อให้ใช้นิ้วสัมผัสบนจอสัมผัสได้อย่างแม่นยำ
  - ใช้ `axios` (XMLHttpRequest) และ Socket.io Fallback Long-Polling แทน Native Fetch / Modern WebSocket ที่อาจหลุดบน iOS 9
- 🍃 **กินทรัพยากรต่ำมาก (Ultra Lightweight)**:
  - ใช้ RAM เพียง **~40 - 60 MB**
  - ใช้ **SQLite (`better-sqlite3`)** เป็นฐานข้อมูลในตัว ไม่ต้องเปิด MySQL / PostgreSQL เพิ่มเติม
  - ไม่เปลือง CPU ปลอดภัยต่อการรันบน Home Server หรือ VPS สเปคต่ำ

---

## 🚀 วิธีติดตั้งและใช้งานบนเซิร์ฟเวอร์ (Deployment)

### วิธีที่ 1: ติดตั้งผ่าน Dockge (ง่ายที่สุด - ผ่านหน้า Web UI)

1. เข้าหน้าเว็บ **Dockge** ของคุณ แล้วกด **"+ Compose"**
2. ใส่ชื่อ Stack: `old-note`
3. ในช่อง Compose ขวามือ คัดลอก YAML ด้านล่างนี้ไปวาง:

```yaml
services:
  old-note:
    # ดึงโค้ดจาก GitHub มา Build อัตโนมัติ
    build: https://github.com/Purachai200/old_note.git#main
    container_name: old-note
    restart: unless-stopped
    ports:
      - "3920:3000"  # เข้าใช้งานผ่านพอร์ต 3920 (เปลี่ยนเลขด้านหน้าได้ตามต้องการ)
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=change-this-to-any-random-secret-key-12345
      - DATA_DIR=/app/backend/data
      - FRONTEND_DIST=/app/frontend/dist
    volumes:
      # จัดเก็บข้อมูล SQLite ไว้ในโฟลเดอร์ data ของ Stack (Backup ง่ายมาก)
      - ./data:/app/backend/data
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 256M
        reservations:
          memory: 64M
```

4. กดปุ่ม **"🚀 ปรับใช้" (Deploy)**
5. เข้าใช้งานผ่านเบราว์เซอร์: `http://<IP_SERVER_ของคุณ>:3920`

---

### วิธีที่ 2: ติดตั้งผ่าน Docker Compose (Command Line / VPS)

1. **Clone Repository**:
```bash
git clone https://github.com/Purachai200/old_note.git
cd old_note
```

2. **สั่งรันด้วย Docker Compose**:
```bash
docker compose up --build -d
```

3. **ตรวจสอบสถานะการทำงาน**:
```bash
docker compose ps
docker compose logs -f
```

4. เข้าใช้งานได้ที่: `http://<IP_SERVER_ของคุณ>:3920` (หรือพอร์ตที่ตั้งไว้ใน compose)

---

### วิธีที่ 3: ติดตั้งผ่าน Portainer

1. เข้าสู่ **Portainer** -> เลือก Environment ของคุณ
2. ไปที่เมนู **Stacks** -> กด **"Add stack"**
3. ตั้งชื่อ Stack: `old-note`
4. เลือกแท็บ **Web editor** แล้วนำโค้ดใน [docker-compose.yml](file:///Users/purachai/Desktop/Purachai/performance-note/docker-compose.yml) ไปวาง
5. กด **"Deploy the stack"**

---

## 📲 วิธีเปิดใช้งานบน iPad Mini 1 (iOS 9.3.5)

1. นำ iPad Mini 1 เชื่อมต่อกับ Wi-Fi วงเดียวกับ Server
2. เปิดเบราว์เซอร์ **Safari** บน iPad
3. พิมพ์ URL: `http://<IP_SERVER_ของคุณ>:3920` (เช่น `http://192.168.1.100:3920`)
4. สมัครบัญชีใหม่ หรือเข้าสู่ระบบด้วยบัญชีเดียวกับบนคอมพิวเตอร์
5. *(แนะนำ)* กดปุ่ม Share (สัญลักษณ์สี่เหลี่ยมลูกศรชี้ขึ้น) ใน Safari แล้วเลือก **"Add to Home Screen" (เพิ่มไปยังหน้าจอโฮม)** เพื่อใช้งานเหมือนแอปพลิเคชันเต็มจอ

---

## ⚙️ Environment Variables (ตัวแปรสภาพแวดล้อม)

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
| :--- | :--- | :--- |
| `PORT` | `3000` | พอร์ตภายใน Container |
| `JWT_SECRET` | `realsync-notes-secret` | คีย์ลับสำหรับ Sign และ Verify Token ของระบบ Login |
| `DATA_DIR` | `/app/backend/data` | ตำแหน่งเก็บไฟล์ฐานข้อมูล `notes.db` ของ SQLite |
| `FRONTEND_DIST` | `/app/frontend/dist` | ตำแหน่งไฟล์ Static ของหน้าเว็บ Vue 3 |

---

## 🛠️ โครงสร้างโปรเจกต์ (Project Structure)

```
old_note/
├── backend/
│   ├── src/
│   │   ├── auth.js          # ระบบ Hash รหัสผ่าน (bcryptjs) & ตรวจสอบ JWT
│   │   ├── db.js            # SQLite Schema (users, notes, checklist_items)
│   │   ├── socket.js        # ตัวจัดการ Real-Time Sync และแยก Room
│   │   └── server.js        # Express HTTP Server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/style.css # สไตล์ชีตที่ทดสอบแล้วว่ารองรับ Safari 9 สมบูรณ์
│   │   ├── components/      # LoginModal, NoteList, NoteEditor
│   │   ├── App.vue          # ตัวควบคุมหลักและการเชื่อมต่อ Socket.io
│   │   └── socket.js        # Socket.io Client แบบ Polling-First สำหรับ iOS 9
│   ├── vite.config.js       # ปลั๊กอิน Legacy สำหรับคอมไพล์ Safari 9 / iOS 9
│   └── package.json
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # ไฟล์ Compose มาตรฐาน
├── compose.yaml             # ไฟล์ Compose สำหรับ Dockge
└── README.md
```

---

## 📄 License
MIT License - สามารถนำไปใช้งาน ติดตั้ง และพัฒนาต่อได้อย่างอิสระครับ
