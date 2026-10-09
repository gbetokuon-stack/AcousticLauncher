# AcousticLauncher - Minecraft Client & Profile Manager

<p align="center">
  <img src="build-resources/icon.png" width="120" alt="AcousticLauncher Logo" />
</p>

<p align="center">
  Trình quản lý và khởi chạy Minecraft (Launcher) tối giản, hiện đại xây dựng trên Electron + React. Hỗ trợ giao diện kính mờ (Glassmorphism), hình nền video động, xác thực Microsoft chính thức và quản lý Java Runtime tự động.
</p>

<p align="center">
  <a href="https://github.com/gbetokuon-stack/AcousticLauncher/releases/tag/v0.1.5">
    <img src="https://img.shields.io/badge/Release-v0.1.5-brightgreen?style=for-the-badge&logo=github" alt="Release v0.1.5" />
  </a>
  <a href="https://github.com/gbetokuon-stack/AcousticLauncher/releases/download/v0.1.5/AcousticForge-Portable-0.1.5.exe">
    <img src="https://img.shields.io/badge/Download-Portable_EXE-blue?style=for-the-badge&logo=windows" alt="Download Portable" />
  </a>
  <a href="https://github.com/gbetokuon-stack/AcousticLauncher/releases/download/v0.1.5/AcousticForge-Setup-0.1.5.exe">
    <img src="https://img.shields.io/badge/Download-Setup_Installer-purple?style=for-the-badge&logo=windows" alt="Download Setup" />
  </a>
</p>

---

## 📥 Tải Về & Khởi Chạy Ngay (Download & Play)

Người dùng không cần cài đặt môi trường lập trình (Node.js, Git) hay gõ bất kỳ dòng lệnh nào. Chỉ cần tải 1 trong 2 bản `.exe` đã được đóng gói sẵn và khởi chạy:

| Phiên Bản | Chi Tiết | Dung Lượng | Tải Về Trực Tiếp |
| :--- | :--- | :---: | :---: |
| **🚀 AcousticForge Portable** | **Khuyên Dùng:** Mở chạy ngay không cần cài đặt. Thích hợp lưu trữ trên USB hoặc chơi nhanh. | ~214 MB | [⬇️ **Tải AcousticForge-Portable-0.1.5.exe**](https://github.com/gbetokuon-stack/AcousticLauncher/releases/download/v0.1.5/AcousticForge-Portable-0.1.5.exe) |
| **📦 AcousticForge Setup** | Bộ cài đặt Windows hoàn chỉnh (Installer), tự tạo biểu tượng Desktop và Start Menu. | ~215 MB | [⬇️ **Tải AcousticForge-Setup-0.1.5.exe**](https://github.com/gbetokuon-stack/AcousticLauncher/releases/download/v0.1.5/AcousticForge-Setup-0.1.5.exe) |

> 📌 **Toàn bộ bản cập nhật:** Truy cập danh sách phiên bản đầy đủ tại [GitHub Releases](https://github.com/gbetokuon-stack/AcousticLauncher/releases).

### 🎮 Hướng Dẫn Nhanh 3 Bước
1. **Tải file:** Nhấp vào liên kết tải về trực tiếp ở bảng phía trên.
2. **Khởi chạy:** Nhấp đúp chuột vào file `.exe` vừa tải *(Nếu Windows hiển thị cảnh báo "Windows protected your PC", chỉ cần chọn **More info** -> **Run anyway**)*.
3. **Thưởng thức:** Đăng nhập tài khoản Microsoft hoặc Offline, chọn phiên bản Minecraft và bấm **Khởi Chạy** để vào game ngay!

---

## ✨ Tính năng chính

- **Giao diện Glassmorphism & Video Background:** Thiết kế giao diện xuyên thấu với hoạt cảnh video động dưới nền. Hỗ trợ cơ chế tự động chuyển ngẫu nhiên video khi mở hoặc chuyển tiếp.
- **Quản lý Profile:** Tạo, sửa đổi và khởi chạy các bản cài Minecraft độc lập. Tự động tải client jar, assets và libraries trực tiếp từ Mojang.
- **Hỗ trợ Mod Loader:** Tự động tải và chạy bộ cài đặt cho Vanilla, Forge, Fabric, NeoForge và OptiFine.
- **Tự động cài đặt Java:** Quét phiên bản game và tự động tải JRE Mojang tương thích (Java 8, 17, 21, 25) về máy cục bộ.
- **Tích hợp tìm kiếm Modpack & Mods:** Tải trực tiếp Mod, Modpack, Resource Pack từ Modrinth và CurseForge về instance.
- **Xác thực Microsoft:** Hỗ trợ đăng nhập tài khoản Microsoft (OAuth2, tự động làm mới token) hoặc tài khoản Offline. Tích hợp hiển thị skin 3D tương tác.
- **Discord Rich Presence & Live Logs:** Hiển thị trạng thái chơi game trực tiếp trên Discord. Tích hợp trình xem logs trực tiếp phân loại màu sắc và tìm kiếm.
- **Chế độ Portable cho ổ cứng di động:** Toàn bộ dữ liệu game được lưu trữ cô lập trong thư mục `data/` cạnh file thực thi.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** React 19, Vite 8, JavaScript
- **Styling:** Vanilla CSS, Tailwind CSS 4
- **Icons:** Phosphor Icons
- **Core:** Electron 42 (Frameless window, IPC communication)
- **3D Render:** Three.js / React Three Fiber (Mô phỏng nhân vật Minecraft)

---

## 👤 Tác giả (Author)

[Acoustic](https://github.com/gbetokuon-stack)
