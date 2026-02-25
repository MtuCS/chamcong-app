1. Collection: advances (Tạm ứng)
Chứa thông tin về các khoản tạm ứng tiền cho nhân viên.

Document ID: advances

Các trường (Fields):

amount: 500.000 (Số tiền).

createdAt: February 7, 2026 (Thời gian tạo bản ghi).

date: February 7, 2026 (Ngày tạm ứng).

employeeId: (Trống).

note: (Trống).

2. Collection: employees (Nhân viên)
Lưu trữ danh sách nhân sự và quyền hạn.

Document ID tiêu biểu: uhSfIoVcyKDZ4MDDKUUB

Các trường (Fields):

active: true (Trạng thái hoạt động).

name: "Ry Trang Hòa".

role: "ADMIN" (Vai trò quản trị).

3. Collection: settings (Cấu hình)
Chứa các thiết lập về định mức lương/thưởng hoặc quy định chung.

Document ID: payRates

Các trường (Fields):

assistantTrip: 300.000 (Tiền công phụ xe mỗi chuyến).

driverTrip: 500.000 (Tiền công tài xế mỗi chuyến).

maxShiftsPerDay: 2 (Số ca tối đa một ngày).

tourTrips: 2.

4. Collection: vehicles (Phương tiện)
Danh sách các xe trong hệ thống với mã nội bộ và biển số.

Các Document tiêu biểu:

ID 5gR38CdNpWPF9k5vSczq: Mã 80, Biển số 50H-687.80.

ID W9fa6V0u0ypDqBo8HMbF: Mã 54, Biển số 50H-264.54.

ID ivPXzw3Es4CnjPS3xTYG: Mã 53, Biển số 50H-675.53.

ID vehicles (mã document trùng tên collection): Mã 85, Biển số 50F-055.85.

5. Collection: worklogs (Nhật ký làm việc)
Cấu trúc theo dạng phân cấp để quản lý các chuyến xe hàng ngày.

Document ID (theo ngày): 2026-02-06

Fields: createdAt, date, dateKey, status ("DRAFT" - Bản nháp).

Sub-collection: runs (Các chuyến chạy trong ngày).

Document ID: iySZF0tT5h9yfqimIv4l

Fields:

assistantId / assistantName: (Trống).

direction: "DL_SG" (Hướng đi Đà Lạt - Sài Gòn).

driverId / driverName: (Trống).

shift: 1 (Ca 1).

trips: 1 (Số chuyến).

vehiclePlate: "50H-675.53" (Biển số xe thực hiện).