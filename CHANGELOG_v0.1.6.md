# AcousticForge v0.1.6 - Tự động phát hiện Mod còn thiếu, Hệ thống tải mod tự động & Bộ Tối Ưu Hóa Game

Bản cập nhật **v0.1.6** mang đến bước nhảy vọt về khả năng quản lý mod và hiệu năng game: tự động giải quyết các mod phụ thuộc còn thiếu, cơ chế tải mod qua trình duyệt kèm tự động nhận diện file tải về hệ thống **tự động tải mod từ nhiều nguồn**, cùng bộ công cụ **Tự động Tối ưu hóa JVM & Gói Mod Tăng FPS 1-Click**.

---

### Các thay đổi chính:

## 🧩 1. Tự động tìm & cài đặt Mod còn thiếu (Missing Mod Dependency Resolver)
- **Hỗ trợ toàn diện Modrinth & CurseForge:** Khi cài đặt một mod bất kỳ, launcher tự động phân tích danh sách các mod phụ thuộc bắt buộc (`Required Dependencies`).
- **Kiểm tra thông minh:** Tự động quét các mod đã cài đặt trong Profile để tránh tải trùng lặp.
- **Tìm kiếm phiên bản tương thích:** Tự động tìm phiên bản mod phụ thuộc phù hợp chính xác với phiên bản Minecraft và Mod Loader (`Fabric`, `Forge`, `NeoForge`, `Quilt`) của profile.
- **Hỗ trợ đệ quy đa tầng:** Tự động dò tìm nếu mod phụ thuộc B lại yêu cầu mod phụ thuộc C.
- **Giao diện xác nhận trực quan (`DependencyConfirmModal`):** Hiển thị danh sách các mod còn thiếu kèm tùy chọn "Cài đặt kèm phụ thuộc" hoặc "Bỏ qua phụ thuộc".
- **Nút "Tìm mod còn thiếu" trong Quản lý Profile:** Cho phép quét toàn bộ thư mục mod của profile để phát hiện và cảnh báo các mod bị thiếu thư viện, ngăn ngừa triệt để lỗi crash game khi khởi động.

## 🌐 2. Tải mod qua trình duyệt hệ thống tải mod tự động (Manual Browser Download)
- **Giải quyết triệt để lỗi CurseForge chặn tải:** Khắc phục trường hợp tác giả mod tắt quyền phân phối bên thứ ba khiến API không trả về link tải trực tiếp.
- **Thuật toán Fallback thông minh:** Tự động thử nghiệm Edge CDN (`edge.forgecdn.net`). Nếu bị chặn (403/404), launcher tự động chuyển tiếp sang luồng tải thủ công qua trình duyệt.
- **Giao diện tải thủ công chuyên nghiệp (`ManualDownloadModal`):**
  - Hiển thị danh sách mod cần tải, tên file `.jar` chính xác và trạng thái tải.
  - Nút **"Mở tất cả trong trình duyệt"** mở lần lượt các trang tải CurseForge với đếm ngược tự động.
  - Nút **"Mở tải về"** riêng lẻ và nút **"Mở thư mục Downloads"**.
- **Background Watcher tự động nhận diện:** Tự động giám sát thư mục `Downloads` của máy tính. Ngay khi file `.jar` tải xong (kể cả khi trình duyệt đổi tên file trùng lặp `(1).jar`), launcher sẽ tự động phát hiện, di chuyển vào thư mục game và chuyển sang trạng thái đã hoàn tất.
- **Kéo & Thả (Drag & Drop):** Hỗ trợ kéo thả file `.jar` trực tiếp vào cửa sổ launcher hoặc chọn file thủ công từ máy tính.
- **Áp dụng cho Modpack:** Hoạt động mượt mà cho cả khi cài mod lẻ lẫn khi import modpack CurseForge có file bị khóa.

## ⚡ 3. Bộ Tối Ưu Hóa Game & JVM Presets (Game Optimizer)
- **Nút "Tự Động Tối Ưu (Auto-Optimize)":** Tự động đo đạc dung lượng RAM phần cứng của máy tính để tính toán lượng RAM tối ưu nhất, đồng thời tự động nhận diện phiên bản Minecraft/Java để áp dụng bộ cờ dọn rác (GC) mượt nhất.
- **Bộ Presets JVM hiện đại:**
  - **Aikar's Flags (G1GC):** Tinh chỉnh chuyên sâu 18 flags giảm thời gian dọn rác xuống còn 5–10ms, loại bỏ hiện tượng khựng khung hình (micro-stutter).
  - **Generational ZGC (Java 21+):** Bộ dọn rác thế hệ mới với độ trễ pause time < 1ms, mượt mà đỉnh cao.
  - **Shenandoah GC:** Độ trễ siêu thấp thích hợp cho các Modpack nặng và máy nhiều RAM.
  - **Potato PC:** Thuật toán SerialGC tiết kiệm RAM tối đa cho máy 4GB RAM.
- **Nút "Gói Mod Tối Ưu (Tăng FPS)" (1-Click Install Optimizer Mods):** Tự động lọc và cài đặt trọn bộ mod tối ưu chuẩn nhất hiện nay (Sodium/Embeddium, Lithium, FerriteCore, ImmediatelyFast, ModernFix, Entity Culling) tương thích theo từng Loader, giúp FPS tăng vọt 200% - 500%.

## 🛠️ 4. Tinh chỉnh & Sửa lỗi hệ thống
- Sửa lỗi xử lý redirect HTTP và đường dẫn tương đối của CurseForge API proxy.
- Cải thiện độ ổn định và hiệu năng giao diện Glassmorphism.

---
**Tác giả (Author):** [Acoustic](https://github.com/gbetokuon-stack)
