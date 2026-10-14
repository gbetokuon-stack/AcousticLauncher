# AcousticForge v0.1.7 - Tối Ưu Triệt Để Giật Lag Modpack & Tải Mod Tự Động Như CurseForge

Bản cập nhật **v0.1.7** khắc phục toàn bộ vấn đề giật lag / khựng hình khi chơi các Modpack nặng (100-400+ mods), đồng thời nâng cấp hệ thống tải mod tự động hoàn toàn không cần can thiệp thủ công:

---

## ⚡ 1. Tối Ưu Triệt Để Giật Lag & Tụt FPS (Zero-Stutter Performance Engine)

- **Ưu tiên Card đồ họa rời (DirectX GPU Priority):** Tự động ép Windows và driver card đồ họa sử dụng GPU rời (NVIDIA RTX / AMD Radeon) thay vì GPU tích hợp.
- **Biến môi trường hiệu năng cao:** Bổ sung `__NV_PRIME_RENDER_OFFLOAD=1`, `__GLX_VENDOR_LIBRARY_NAME=nvidia`, `MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA` và tự động gán tiến trình `javaw.exe` mức ưu tiên `HIGH_PRIORITY_CLASS`.
- **Cấu hình RAM thông minh cho Modpack:** Tự động phát hiện dung lượng RAM hệ thống và đặt mức khởi đầu tối ưu (8GB RAM cho máy 16GB), tránh tràn Heap hoặc thiếu RAM khi tải thế giới.
- **Bộ cờ JVM "Siêu Modpack":** Tối ưu hóa G1GC với Heap Region 16MB (`-XX:G1HeapRegionSize=16M`), giảm thời gian GC pause xuống 200ms, loại bỏ hiện tượng giật cục mỗi vài giây khi sinh chunk hoặc di chuyển nhanh.
- **Tự động tinh chỉnh game options:** Tối ưu hóa các thông số game tránh nghẽn luồng render: tắt VSync cưỡng bức, giới hạn framerate hợp lý, và tối ưu chunk builder threads.

---

## 📦 2. Tải Mod Tự Động Đầy Đủ 6 Tầng Như CurseForge App

- **6 Kênh Fallback Tự Động:**
  1. *CurseForge Official API*
  2. *Edge CDN*: `edge.forgecdn.net`
  3. *Mediafilez CDN*: `mediafilez.forgecdn.net`
  4. *Media CDN*: `media.forgecdn.net`
  5. *CurseForge Web Stream API*: Tải ngầm bỏ qua chặn phân phối của bên thứ ba
  6. *Modrinth Cross-Lookup*: Tự động đối chiếu và tải file tương thích từ Modrinth nếu CurseForge chặn tuyệt đối.
- **Loại bỏ hoàn toàn thông báo tải thủ công không cần thiết:** Tự động giải quyết mọi phụ thuộc và tải đầy đủ mod vào game.
- **Xóa bỏ toàn bộ branding bên ngoài:** Giao diện thuần AcousticForge mượt mà, chuyên nghiệp.

---

## 🚀 3. Khởi Chạy Nhanh Tránh Bị Smart App Control Chặn

- Cung cấp sẵn file `Khoi-Chay-AcousticForge.bat` trên ổ D và Desktop giúp người dùng mở launcher ngay lập tức mà không bị Windows 11 Smart App Control chặn.
- Hỗ trợ cập nhật trực tiếp qua Git mà không cần tải lại file cài đặt 225MB mỗi lần.
