# meowide | Character Chat

meowide เป็นเว็บแอป Character Chat สำหรับเลือกคุยกับบอทตัวละครสไตล์ SillyTavern โดยทำด้วย Vanilla HTML, CSS และ JavaScript ล้วน ไม่ใช้ framework

เว็บไซต์: https://ortan07.github.io/char-bot/

## จุดเด่น

- หน้า Explore สำหรับค้นหาและเลือกตัวละคร
- การ์ดบอทแบบ responsive พร้อมเอฟเฟกต์ 3D tilt
- Modal แสดงรายละเอียดตัวละครก่อนเริ่มแชท
- หน้าแชทแบบเต็มจอ พร้อม topbar, กล่องข้อความ, input และ sidebar ข้อมูลตัวละคร
- บันทึก recent chats และ comment ส่วนตัวด้วย localStorage
- รองรับ Gemini API รุ่น `gemini-2.0-flash`
- ถ้าไม่มี API key ระบบจะใช้ fallback reply ภายในเครื่องแทน
- ธีมมืดแบบ glassmorphism พร้อม accent color ตามบอทแต่ละตัว

## โครงสร้างไฟล์

```txt
index.html   โครงสร้างหน้าเว็บ
style.css    ดีไซน์และ animation
app.js       ระบบ UI, chat, localStorage และ Gemini API
bots.js      ข้อมูลตัวละคร
README.md    คำอธิบายโปรเจกต์
```

## การใช้งาน

เปิดไฟล์ `index.html` ผ่าน browser หรือใช้ Live Server ใน VS Code

ถ้าต้องการให้เพื่อนลองเล่นออนไลน์ ให้ push โปรเจกต์ขึ้น GitHub แล้วเปิดผ่าน GitHub Pages:

```txt
https://ortan07.github.io/char-bot/
```

## การเพิ่มตัวละคร

เพิ่มข้อมูลตัวละครใหม่ใน `bots.js` ตามโครงสร้างนี้:

```js
{
  id,
  name,
  role,
  color,
  colorSoft,
  hasImg,
  img,
  emoji,
  tags,
  desc,
  likes,
  dislikes,
  msgs,
  greet,
  system
}
```

ระบบจะนำข้อมูลไปแสดงในหน้า Explore และใช้ `system` เป็น prompt ของบอทตอนเรียก Gemini API

## หมายเหตุเรื่อง API

โปรเจกต์นี้ไม่เก็บ API key ใน localStorage ถ้าต้องการใช้ Gemini จริง ให้ใส่ key ในตัวแปร `GEMINI_API_KEY` ภายใน `app.js`

ถ้าไม่ใส่ API key เว็บยังเล่นได้ตามปกติ แต่บอทจะตอบด้วยข้อความ fallback แบบสุ่ม
