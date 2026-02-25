Hướng dẫn Deploy lên Firebase Hosting
Bước 1: Cài đặt Firebase CLI (nếu chưa có)
    npm install -g firebase-tools
Bước 2: Đăng nhập Firebase
    firebase login
Bước 3: Build ứng dụng
    npm run build   
Lệnh này sẽ tạo thư mục dist chứa các file static.

Bước 4: Khởi tạo Firebase Hosting
    firebase init hosting
Khi được hỏi:

What do you want to use as your public directory? → Nhập dist
Configure as a single-page app? → Chọn Yes
Set up automatic builds with GitHub? → Chọn No (hoặc Yes nếu muốn CI/CD)
File index.html already exists. Overwrite? → Chọn No
Bước 5: Deploy
    firebase deploy --only hosting
Kết quả
Sau khi deploy thành công, bạn sẽ nhận được URL dạng:

Lưu ý quan trọng
firebase.json - Kiểm tra cấu hình hosting:
Mỗi lần update code, chạy lại:
Bạn muốn tôi giúp kiểm tra cấu hình firebase.json hiện tại không?