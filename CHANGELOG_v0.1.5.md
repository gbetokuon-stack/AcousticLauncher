# XForge v0.1.5 - Bản cập nhật Lịch sử Cập nhật & Tối ưu hóa Trải nghiệm Java/NeoForge

Bản cập nhật v0.1.5 tập trung nâng cao trải nghiệm người dùng thông qua việc tự động hóa các luồng cài đặt game, hỗ trợ đầy đủ Mod Loader NeoForge mới, và tích hợp bộ thông báo cập nhật trực tiếp vô cùng chuyên nghiệp.

### Các thay đổi chính:

## 1. 🔔 Tích hợp Thông báo Cập nhật Messenger Style
- Thêm biểu tượng **Chuông báo (Bell icon)** ngay trên thanh tiêu đề ứng dụng (TitleBar).
- **Chấm đỏ thông báo mới:** Tự động phát hiện phiên bản phát hành mới từ GitHub (gbetokuon-stack/AcousticLauncher) và hiển thị chấm đỏ báo hiệu. Tự động tắt chấm đỏ sau khi click.
- **Dropdown danh sách:** Click vào chuông sẽ rủ xuống menu dropdown chứa danh sách 3 bản cập nhật mới nhất (cuộn chuột để xem các bản cũ hơn) được thiết kế dạng kính mờ tinh tế.
- **Modal chi tiết:** Click vào một bản cập nhật bất kỳ sẽ hiển thị Modal changelog với bộ parse Markdown tự xây dựng cực đẹp mắt và nút đi tới GitHub trực tiếp.
- **Đồng bộ scrollbar:** Tùy chỉnh thanh cuộn siêu mảnh, màu hồng bo góc đồng bộ 100% với phong cách chung của launcher.

## 2. 🎮 Tự động tải & Cài đặt khi bấm nút "Chơi"
- Nút **"Chơi"** hoạt động thông minh hơn: Nếu profile game chưa được cài đặt đầy đủ (thiếu libraries, assets, hoặc loader), launcher sẽ **tự động chạy trình cài đặt (Installer)** ở nền sau.
- Hiển thị trực quan thanh **ProgressBar** và thông tin chi tiết các file đang tải ngay trên trang Chơi.
- Sau khi cài đặt hoàn tất, game sẽ **tự động khởi chạy ngay lập tức** mà không đòi hỏi thao tác click phụ.

## ⚙️ 3. Hỗ trợ và Sửa lỗi NeoForge Installer
- **Tạo launcher_profiles.json giả lập:** Tự động tạo file `launcher_profiles.json` chuẩn cấu hình trong thư mục game của profile trước khi khởi động installer. Giúp trình cài đặt chính thức của NeoForge vượt qua lỗi *There is no minecraft launcher profile* (exit code 1) và cài đặt thành công 100%.
- **Sửa lỗi nhận diện JRE Snapshot:** Sửa logic phân tích phiên bản game đối với định dạng Snapshot Mojang (ví dụ: `24w40a` của bản 1.21). Hệ thống nhận dạng đúng và tự động gán **Java 21** (`java-runtime-delta`) để khởi chạy thay vì chọn Java 8 bị lỗi `Unrecognized option`.

## ☕ 4. Gộp nút Cài đặt JRE tự động
- Thiết kế lại trang **Cài đặt**: Thay vì nút cài đặt riêng lẻ cho từng dòng JRE, trang Cài đặt giờ đây hiển thị duy nhất 1 nút lớn nổi bật **"Cài đặt tất cả"** hoặc **"Tải lại toàn bộ"** JRE Mojang (Java 8, 17, 21, 25).
- Các dòng JRE riêng lẻ chỉ hiển thị text "Chưa cài đặt" hoặc nút "Gỡ" nhanh để dọn ổ cứng.

---
**Tác giả (Author):** [Acoustic](https://github.com/gbetokuon-stack)
