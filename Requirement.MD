ĐẶC TẢ NGHIỆP VỤ

Hệ thống quản lý nhật ký chạy xe & chấm công vận tải

1. Mục tiêu hệ thống

Hệ thống dùng để:

Ghi nhận lịch chạy xe theo ngày

Mỗi ngày có nhiều xe, 2 chiều chạy

Mỗi xe có thể chạy 1 hoặc 2 ca

Gán tài xế / phụ xe linh hoạt

Tự động quy đổi chuyến → tour → tiền công

Cho phép lưu nháp – chỉnh sửa – chốt sổ

Báo cáo:

Theo ngày

Theo nhân viên

Theo tháng

Theo dõi ứng lương

Cấu hình đơn giá tập trung

2. Các khái niệm nghiệp vụ cốt lõi
2.1 Tuyến & ca

Có 2 hướng chạy cố định:

DL_SG : Đắk Lắk → Sài Gòn

SG_DL : Sài Gòn → Đắk Lắk

Mỗi hướng trong ngày có thể có N xe (không giới hạn)

Mỗi xe có thể chạy:

Ca 1

Ca 2

Hoặc cả 2 ca

❗ Không có khái niệm “mỗi tuyến chỉ 1 xe”

2.2 Chuyến – tour – cách tính công

1 chuyến (trip) = 1 ca

1 tour = 2 chuyến

Đối tượng	Giá / chuyến	Giá / tour
Tài xế	500.000	1.000.000
Phụ xe	300.000	600.000

Mỗi người:

Tối đa 2 ca / ngày

Có thể chạy 1 hoặc 2 ca

Công tính theo:

Tổng chuyến

Quy đổi ra tour (2 chuyến = 1 tour)

3. Nhân sự (Employees)
3.1 Nguyên tắc quan trọng

Nhân sự KHÔNG cố định

Có thể:

Thêm mới liên tục

Nghỉ việc

Không ép user phải vào Settings tạo trước

3.2 Cách nhập nhân sự (đã chốt)

UI dùng EmployeeInput

Flow:

Gõ tên

Autocomplete nếu tồn tại

Nếu không tồn tại → hiện:

+ Thêm nhanh "Nguyễn Văn A"

Click → tạo employee mới ngay lập tức

3.3 Lưu trữ nhân sự
employees/{employeeId}
{
  name: string
  role: "DRIVER" | "ASSISTANT" | "ADMIN"
  active: boolean
  createdAt
}


employeeId:

Auto-generated (Firestore-style random)

Khi nghỉ việc:

active = false

KHÔNG xoá dữ liệu cũ

4. Nhật ký chạy xe (Worklogs)
4.1 Cấp ngày (Worklog)

Mỗi ngày = 1 document

worklogs/{dateKey}
{
  dateKey: "2026-02-06"
  date: "2026-02-06"
  status: "DRAFT" | "FINAL"
  createdAt
}


dateKey = YYYY-MM-DD

status:

DRAFT: còn chỉnh sửa

FINAL: đã chốt → không cho sửa

4.2 Cấp chuyến (Runs)

Mỗi chuyến chạy = 1 run

worklogs/{dateKey}/runs/{runId}
{
  direction: "DL_SG" | "SG_DL"
  shift: 1 | 2
  vehiclePlate: string

  driverId: string | null
  assistantId: string | null

  trips: number   // số chuyến (1 hoặc 2)
}

🔑 Quy ước cực kỳ quan trọng

LUÔN lưu driverId, assistantId

KHÔNG dùng name làm khoá

driverName / assistantName:

Chỉ dùng hiển thị (optional, derived)

5. Cấu hình hệ thống (Settings)
settings/payRates
{
  driverTrip: number        // 500000
  assistantTrip: number     // 300000
  tourTrips: 2
  maxShiftsPerDay: 2
}


Chỉ admin được chỉnh

Giá mới:

Chỉ áp dụng cho worklog chưa chốt

Worklog đã FINAL → giữ nguyên

6. Ứng lương (Advances)
advances/{advanceId}
{
  employeeId
  amount
  date
  note?
}


Trừ vào tổng lương khi báo cáo

7. Luồng nghiệp vụ chuẩn (end-to-end)
7.1 Nhập liệu ngày

Chọn ngày

Thêm xe cho từng hướng

Gán ca (1 / 2)

Nhập tài xế / phụ xe

Autocomplete

Quick add nếu chưa tồn tại

Lưu → status = DRAFT

7.2 Chốt sổ

Admin bấm Chốt sổ

status = FINAL

Khóa chỉnh sửa

8. Báo cáo
8.1 Theo ngày

Danh sách run

Tổng chuyến

Tổng tour

Tổng tiền

8.2 Theo nhân viên

Gom theo employeeId

Không sợ trùng tên

Hiển thị:

Số chuyến

Số tour

Tổng tiền

Trừ ứng

9. Nguyên tắc thiết kế (để agent không làm sai)
❌ Không làm

Không dùng tên làm khoá

Không lưu nhân sự cứng trong run

Không tạo employee thủ công trong Firebase

✅ Bắt buộc

Employee có ID thật

Run chỉ tham chiếu ID

Quick add trong UI

Worklog có trạng thái

Logic tính tiền độc lập UI