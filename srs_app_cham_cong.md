# ĐẶC TẢ NGHIỆP VỤ APP CHẤM CÔNG – QUẢN LÝ TUYẾN & CÔNG

---

## 1. Mục tiêu ứng dụng (Thay thế ghi chép giấy)

Hiện tại dữ liệu được quản lý thủ công bằng giấy, gồm **2 bảng độc lập**:

### 1.1. Bảng phân công theo ngày – theo tuyến

**Ngày X**

- **Tuyến:** Đắk Lắk ↔ Sài Gòn, Sài Gòn ↔ Đắk Lắk
- Mỗi tuyến gồm:
  - Xe
  - Tài xế
  - Phụ xe
  - Chia **Ca 1 / Ca 2** hoặc **Chạy 1 / Chạy 2**

### 1.2. Bảng tổng hợp theo người trong tháng

Mỗi nhân sự có bảng theo dõi:

- Ngày
- Ca 1 / Ca 2 (tick)
- Xe
- Số tua / công (0.5, 1, …)
- Ứng lương
- Ghi chú

**Cuối tháng**:

```
Tổng công → Tổng tiền → Trừ ứng → Còn lại
```

### 1.3. Mục tiêu của App

👉 **Gộp 2 bảng trên thành MỘT nguồn dữ liệu duy nhất (nhập theo ngày)**, từ đó:

- Tự động sinh bảng tổng hợp theo người
- Giảm nhập liệu trùng lặp
- Tránh sai sót cộng tay
- Dễ audit – đối soát – xuất báo cáo

---

## 2. Quy trình nghiệp vụ chuẩn (Business Flow)

### 2.1. Vai trò hệ thống

| Vai trò | Quyền hạn |
|------|---------|
| **Admin / Quản lý** | Quản lý danh mục, đơn giá, chốt ngày – chốt tháng, xuất báo cáo |
| **Nhân sự / Điều hành** | Nhập phân công hằng ngày, nhập phiếu ứng (nếu được phân quyền) |
| *(Tuỳ chọn)* Tài xế / Phụ xe | Chỉ xem công của mình |

> Giai đoạn MVP **chưa bắt buộc** có tài khoản tài xế/phụ xe.

---

## 3. Danh mục cần có (Master Data)

### 3.1. Nhân sự (Employees)

- Mã nhân sự
- Họ tên
- SĐT (tuỳ chọn)
- Vai trò:
  - Tài xế
  - Phụ xe
  - Hoặc cả 2
- Trạng thái:
  - Đang làm
  - Nghỉ việc
- *(Tuỳ chọn)*
  - Đơn giá theo tua / ca
  - Phụ cấp

---

### 3.2. Xe (Vehicles)

- Mã xe (VD: 53, 80, 85…)
- Biển số (tuỳ chọn)
- Trạng thái hoạt động

---

### 3.3. Tuyến & Ca

#### Tuyến (Routes)

- Đắk Lắk → Sài Gòn
- Sài Gòn → Đắk Lắk
- Có thể mở rộng tuyến khác

#### Ca (Shifts)

- Ca 1
- Ca 2
- Hoặc logic **Chuyến 1 / Chuyến 2 (đi – về)**

---

### 3.4. Đơn giá & Quy tắc tính công (Rates)

- 1 chuyến = 1 tua hay 0.5 tua?
- Ca 1 / Ca 2 tương ứng bao nhiêu công?
- Có phụ cấp:
  - Ban đêm
  - Ngày lễ
  - Tăng cường

👉 **Toàn bộ quy tắc cấu hình sẵn**, app tự tính, không cộng tay.

---

## 4. Nghiệp vụ hằng ngày (Daily Operation)

### 4.1. Bước 1: Tạo “Nhật ký vận hành ngày”

- Chọn **Ngày**
- App hiển thị danh sách tuyến trong ngày (ví dụ: 2 tuyến đối lưu)

#### Với mỗi tuyến, nhập:

- Xe
- **Ca 1**:
  - Tài xế
  - Phụ xe
- **Ca 2**:
  - Tài xế
  - Phụ xe
- Số tua / công cho từng người:
  - App tự tính theo cấu hình **hoặc**
  - Cho phép nhập tay nếu ngoại lệ

---

### 4.2. Ràng buộc nghiệp vụ (Validation)

- ❌ Một người **không được** chạy 2 tuyến cùng ca
- ❌ Một xe **không được** chạy 2 tuyến cùng ca
- ⚠️ Nếu đổi người giữa chừng:
  - Cho phép nhập
  - Bắt buộc ghi chú / đổi ca

App **cảnh báo ngay khi nhập**, không đợi cuối ngày.

---

### 4.3. Bước 2: Chốt ngày

- Sau khi nhập xong → **Quản lý bấm “Chốt ngày”**
- Dữ liệu chuyển sang trạng thái **Lock** (không sửa)
- Chỉ **Admin** mới có quyền mở khoá

---

## 5. Nghiệp vụ ứng lương (Advance)

### 5.1. Các phương án

**Cách 1 – Phiếu ứng riêng (Khuyến nghị)** ✅

- Tạo phiếu ứng:
  - Ngày
  - Nhân sự
  - Số tiền
  - Ghi chú

Ưu điểm:
- Dễ audit
- Dễ tổng hợp
- Không phụ thuộc nhật ký ngày

**Cách 2 – Ứng ngay trong nhật ký ngày** ❌

- Tick vào chuyến
- Nhập tiền ứng

Nhược điểm:
- Khó quản trị
- Khó tổng hợp về sau

---

## 6. Tổng hợp cuối tháng (Payroll / Timesheet)

### 6.1. Báo cáo công theo người

Khi chọn **Tháng N**:

Mỗi nhân sự có:

- Tổng tua / tổng ca
- Danh sách ngày đã chạy:
  - Tuyến
  - Xe
  - Ca
- Tổng tiền theo đơn giá
- Tổng tiền đã ứng
- **Số tiền còn lại phải trả**

---

### 6.2. Chốt tháng

- Quản lý bấm **“Chốt tháng”**
- Khoá toàn bộ dữ liệu tháng
- Xuất:
  - Excel
  - PDF
- Gửi kế toán / lưu trữ

---

## 7. Mô hình dữ liệu tối thiểu (MVP Data Model)

### 7.1. Employees

```
{id, name, phone?, role, status, rate?}
```

### 7.2. Vehicles

```
{id, plate?, status}
```

### 7.3. Routes

```
{id, name}
```

### 7.4. Shifts

```
{id, name}  // Ca 1, Ca 2 (có thể hard-code)
```

### 7.5. DailyTrips (Nhật ký ngày)

```
{
  date,
  route_id,
  vehicle_id,
  shift,        // 1 | 2
  driver_id,
  assistant_id,
  driver_units,     // 0.5 | 1
  assistant_units,  // 0.5 | 1
  note,
  status            // draft | locked
}
```

### 7.6. Advances (Phiếu ứng)

```
{date, employee_id, amount, note}
```

### 7.7. Rates (Đơn giá & quy tắc)

```
{type, value, condition}
```

---

## 8. Phạm vi MVP

✔️ Đủ để:
- Nhập phân công hằng ngày
- Tự động tổng hợp công
- Trừ ứng
- Xuất báo cáo cuối tháng

---

**→ Đây là bản nghiệp vụ chuẩn để dev bắt tay làm MVP ngay.**

