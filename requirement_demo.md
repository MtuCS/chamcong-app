1) Mục tiêu app (thay thế giấy)
Dữ liệu mày đang ghi tay gồm 2 phần

Bảng phân công theo ngày – theo tuyến

Ngày X

Tuyến: Đắk Lắk ↔ Sài Gòn và Sài Gòn ↔ Đắk Lắk

Mỗi tuyến có: Xe, Tài xế, Phụ xe, có thể chia ca 1/ca 2 hoặc “chạy 1/chạy 2”.

Bảng tổng hợp theo người trong tháng

Ngày

Ca 1 / Ca 2 (tick)

Xe

Số tua/công (0.5, 1, …)

Ứng lương

Ghi chú

Cuối tháng: Tổng công → Tổng tiền → Trừ ứng → Còn lại

=> App sẽ gom 2 phần đó vào một nguồn dữ liệu duy nhất (nhập theo ngày), rồi tự sinh ra bảng tổng hợp.

2) Quy trình nghiệp vụ chuẩn (Business Flow)
Vai trò

Quản lý (Admin): tạo danh sách xe, tuyến, tài xế/phụ xe, đơn giá; chốt công; xuất báo cáo.

Nhân sự/Điều hành (User): nhập phân công hằng ngày, nhập ứng lương (nếu được phân quyền).

(Tuỳ chọn) Tài xế/phụ xe: chỉ xem công của mình (không bắt buộc ở giai đoạn đầu).

3) Danh mục cần có (Master Data)

Nhân sự

Mã NV, Họ tên, SĐT (tuỳ), Vai trò (Tài xế/Phụ xe/cả 2), trạng thái (đang làm/nghỉ)

(Tuỳ chọn) mức lương theo tua/ca, phụ cấp

Xe

Mã xe (53, 80, 85…), biển số (tuỳ), trạng thái hoạt động

Tuyến / Ca

Tuyến: Đắk Lắk → Sài Gòn, Sài Gòn → Đắk Lắk (và tuyến khác nếu có)

Ca: Ca 1, Ca 2 (hoặc “chuyến 1/chuyến 2 (đi/về)”)

Đơn giá & quy tắc tính công

1 chuyến = 1 tua? hay có 0.5 tua?

Ca 1/2 tương ứng 0.5 hay 1?

Có phụ cấp đêm / lễ / tăng cường không?
=> Cái này mày cấu hình để sau này khỏi cộng tay.

4) Nghiệp vụ hằng ngày (Daily Operation)
Bước 1: Tạo “Nhật ký vận hành ngày”

Chọn Ngày

App hiện danh sách tuyến trong ngày (ví dụ 2 tuyến đối lưu)

Với mỗi tuyến, nhập:

Xe

Ca 1: tài xế + phụ xe

Ca 2: tài xế + phụ xe

“Số tua/công” cho từng người (nếu quy tắc không cố định) hoặc để app tự tính theo ca

Ràng buộc nên có

Một người không được bị xếp trùng giờ/2 tuyến cùng ca (app cảnh báo).

Xe không được chạy 2 tuyến cùng ca (app cảnh báo).

Nếu đổi người giữa chừng: cho phép “ghi chú/đổi ca”.

Bước 2: Chốt ngày (tuỳ chọn)

Sau khi nhập xong, quản lý bấm “Chốt ngày” để tránh sửa lung tung.

Nếu cần sửa, chỉ Admin mở khoá.

5) Nghiệp vụ ứng lương (Advance)

Có 2 cách (mày chọn 1):

Ứng theo ngày: vào ngày nào ứng thì tạo phiếu ứng (ngày, người, số tiền, ghi chú).

Ứng ngay trong nhật ký ngày: tick vào chuyến đó và nhập số tiền ứng (nhưng về sau khó quản trị hơn).

Khuyến nghị: phiếu ứng riêng vì dễ audit.

6) Tổng hợp cuối tháng (Payroll / Timesheet)
Bước 1: Báo cáo công theo người (tự sinh)

Khi chọn tháng 12:

Mỗi tài xế/phụ xe có:

Tổng tua / tổng ca

Danh sách ngày đã chạy (chi tiết từng tuyến/xe/ca)

Tổng tiền theo đơn giá

Tổng ứng

Còn lại phải trả

Bước 2: Chốt tháng

Quản lý “Chốt tháng” để khóa số liệu.

Xuất file Excel/PDF gửi kế toán (nếu cần).

7) Mô hình dữ liệu tối thiểu (để dev làm)

Bảng/Collection đề xuất

Employees (nhân sự)

Vehicles (xe)

Routes (tuyến)

Shifts (ca) – hoặc hard-code Ca1/Ca2

DailyTrips (nhật ký ngày)

date

route_id

vehicle_id

shift (1/2)

driver_id

assistant_id

driver_units (0.5/1)

assistant_units (0.5/1)

note

status (draft/locked)

Advances (phiếu ứng)

date, employee_id, amount, note

Rates (đơn giá/quy tắc)

Chỉ cần vậy là app chạy được MVP.