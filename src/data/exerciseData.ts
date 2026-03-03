// Exercise data for grades 6-9 (KHTN curriculum)
export interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number; // index 0-3
  explanation: string;
}

export interface Topic {
  id: string;
  name: string;
  icon: string;
  questions: Question[];
}

export interface GradeData {
  grade: number;
  topics: Topic[];
}

export const exerciseData: GradeData[] = [
  {
    grade: 6,
    topics: [
      {
        id: 'g6-intro',
        name: 'Mở đầu về KHTN',
        icon: 'explore',
        questions: [
          {
            id: 'g6-1-1',
            question: 'Khoa học tự nhiên bao gồm các lĩnh vực nào?',
            options: ['Vật lý, Hóa học, Sinh học', 'Toán, Văn, Anh', 'Lịch sử, Địa lý', 'Tin học, Công nghệ'],
            correct: 0,
            explanation: 'KHTN bao gồm Vật lý, Hóa học và Sinh học - nghiên cứu các hiện tượng tự nhiên.',
          },
          {
            id: 'g6-1-2',
            question: 'Đơn vị đo chiều dài trong hệ SI là gì?',
            options: ['Kilogram', 'Mét', 'Giây', 'Kelvin'],
            correct: 1,
            explanation: 'Mét (m) là đơn vị đo chiều dài cơ bản trong hệ SI.',
          },
          {
            id: 'g6-1-3',
            question: 'Kính lúp dùng để làm gì?',
            options: ['Nhìn vật ở xa', 'Quan sát vật nhỏ', 'Đo nhiệt độ', 'Đo khối lượng'],
            correct: 1,
            explanation: 'Kính lúp giúp phóng to hình ảnh của các vật nhỏ để quan sát chi tiết hơn.',
          },
          {
            id: 'g6-1-4',
            question: 'Tế bào là gì?',
            options: ['Đơn vị cấu tạo của cơ thể sống', 'Một loại mô', 'Một loại cơ quan', 'Một loại chất'],
            correct: 0,
            explanation: 'Tế bào là đơn vị cấu tạo và chức năng cơ bản của mọi cơ thể sống.',
          },
          {
            id: 'g6-1-5',
            question: 'Chất nào sau đây ở thể lỏng ở điều kiện thường?',
            options: ['Sắt', 'Nước', 'Oxy', 'Muối ăn'],
            correct: 1,
            explanation: 'Nước (H₂O) tồn tại ở thể lỏng ở điều kiện thường (nhiệt độ phòng, 1 atm).',
          },
        ],
      },
      {
        id: 'g6-cell',
        name: 'Tế bào',
        icon: 'biotech',
        questions: [
          {
            id: 'g6-2-1',
            question: 'Thành phần nào có trong tế bào thực vật nhưng KHÔNG có trong tế bào động vật?',
            options: ['Nhân tế bào', 'Thành tế bào', 'Tế bào chất', 'Màng tế bào'],
            correct: 1,
            explanation: 'Thành tế bào (cell wall) bằng cellulose chỉ có ở tế bào thực vật, giúp tế bào có hình dạng cố định.',
          },
          {
            id: 'g6-2-2',
            question: 'Bào quan nào thực hiện quá trình quang hợp?',
            options: ['Ti thể', 'Lục lạp', 'Ribosome', 'Nhân'],
            correct: 1,
            explanation: 'Lục lạp (chloroplast) chứa chất diệp lục, thực hiện quang hợp chuyển năng lượng ánh sáng thành năng lượng hóa học.',
          },
          {
            id: 'g6-2-3',
            question: 'Nhân tế bào có chức năng chính là gì?',
            options: ['Tổng hợp protein', 'Chứa vật chất di truyền', 'Quang hợp', 'Tiêu hóa'],
            correct: 1,
            explanation: 'Nhân tế bào chứa ADN - vật chất di truyền, điều khiển mọi hoạt động sống của tế bào.',
          },
        ],
      },
    ],
  },
  {
    grade: 7,
    topics: [
      {
        id: 'g7-atom',
        name: 'Nguyên tử',
        icon: 'science',
        questions: [
          {
            id: 'g7-1-1',
            question: 'Nguyên tử được cấu tạo bởi?',
            options: ['Proton và neutron', 'Hạt nhân và vỏ electron', 'Chỉ có electron', 'Chỉ có proton'],
            correct: 1,
            explanation: 'Nguyên tử gồm hạt nhân (chứa proton, neutron) và vỏ electron bao quanh.',
          },
          {
            id: 'g7-1-2',
            question: 'Hạt mang điện tích dương trong nguyên tử là?',
            options: ['Electron', 'Neutron', 'Proton', 'Ion'],
            correct: 2,
            explanation: 'Proton mang điện tích dương (+1), nằm trong hạt nhân nguyên tử.',
          },
          {
            id: 'g7-1-3',
            question: 'Số proton trong nguyên tử xác định?',
            options: ['Khối lượng nguyên tử', 'Nguyên tố hóa học', 'Số neutron', 'Trạng thái vật chất'],
            correct: 1,
            explanation: 'Số proton (số hiệu nguyên tử Z) quyết định nguyên tố hóa học đó là gì.',
          },
        ],
      },
      {
        id: 'g7-speed',
        name: 'Tốc độ',
        icon: 'speed',
        questions: [
          {
            id: 'g7-2-1',
            question: 'Công thức tính tốc độ là gì?',
            options: ['v = s × t', 'v = s / t', 'v = t / s', 'v = s + t'],
            correct: 1,
            explanation: 'Tốc độ = Quãng đường / Thời gian (v = s/t). Đơn vị: m/s hoặc km/h.',
          },
          {
            id: 'g7-2-2',
            question: 'Một xe đi 120km trong 2 giờ. Tốc độ trung bình là bao nhiêu?',
            options: ['30 km/h', '60 km/h', '90 km/h', '120 km/h'],
            correct: 1,
            explanation: 'v = s/t = 120/2 = 60 km/h',
          },
        ],
      },
    ],
  },
  {
    grade: 8,
    topics: [
      {
        id: 'g8-reaction',
        name: 'Phản ứng hóa học',
        icon: 'local_fire_department',
        questions: [
          {
            id: 'g8-1-1',
            question: 'Dấu hiệu nào cho biết phản ứng hóa học đã xảy ra?',
            options: ['Thay đổi màu sắc', 'Tạo kết tủa', 'Tỏa nhiệt hoặc phát sáng', 'Tất cả đáp án trên'],
            correct: 3,
            explanation: 'Phản ứng hóa học có thể nhận biết qua: đổi màu, kết tủa, sủi bọt khí, tỏa nhiệt/phát sáng.',
          },
          {
            id: 'g8-1-2',
            question: 'Trong phản ứng hóa học, chất nào bị biến đổi?',
            options: ['Chất xúc tác', 'Chất phản ứng', 'Dung môi', 'Không có chất nào'],
            correct: 1,
            explanation: 'Chất phản ứng (chất tham gia) bị biến đổi thành sản phẩm mới.',
          },
          {
            id: 'g8-1-3',
            question: 'Phương trình hóa học cân bằng: 2H₂ + O₂ → ?',
            options: ['H₂O', '2H₂O', 'H₂O₂', '2H₂O₂'],
            correct: 1,
            explanation: '2H₂ + O₂ → 2H₂O. Theo định luật bảo toàn khối lượng, số nguyên tử mỗi nguyên tố phải bằng nhau ở hai vế.',
          },
        ],
      },
      {
        id: 'g8-pressure',
        name: 'Áp suất',
        icon: 'compress',
        questions: [
          {
            id: 'g8-2-1',
            question: 'Công thức tính áp suất là?',
            options: ['p = F × S', 'p = F / S', 'p = S / F', 'p = F + S'],
            correct: 1,
            explanation: 'Áp suất p = F/S, trong đó F là lực tác dụng (N), S là diện tích bị ép (m²). Đơn vị: Pa (Pascal).',
          },
          {
            id: 'g8-2-2',
            question: 'Áp suất khí quyển tiêu chuẩn bằng bao nhiêu mmHg?',
            options: ['660 mmHg', '760 mmHg', '860 mmHg', '960 mmHg'],
            correct: 1,
            explanation: 'Áp suất khí quyển tiêu chuẩn = 760 mmHg = 101325 Pa ≈ 1 atm.',
          },
        ],
      },
    ],
  },
  {
    grade: 9,
    topics: [
      {
        id: 'g9-energy',
        name: 'Năng lượng',
        icon: 'bolt',
        questions: [
          {
            id: 'g9-1-1',
            question: 'Động năng phụ thuộc vào yếu tố nào?',
            options: ['Khối lượng và vận tốc', 'Khối lượng và độ cao', 'Vận tốc và thời gian', 'Lực và quãng đường'],
            correct: 0,
            explanation: 'Động năng Wđ = ½mv², phụ thuộc vào khối lượng (m) và vận tốc (v) của vật.',
          },
          {
            id: 'g9-1-2',
            question: 'Năng lượng không tự sinh ra và cũng không tự mất đi, nó chỉ chuyển hóa từ dạng này sang dạng khác. Đây là nội dung của?',
            options: ['Định luật Newton', 'Định luật bảo toàn năng lượng', 'Định luật Ohm', 'Định luật Archimedes'],
            correct: 1,
            explanation: 'Đây là nội dung định luật bảo toàn và chuyển hóa năng lượng - một trong những định luật cơ bản của vật lý.',
          },
        ],
      },
      {
        id: 'g9-genetics',
        name: 'Di truyền',
        icon: 'genetics',
        questions: [
          {
            id: 'g9-2-1',
            question: 'ADN có cấu trúc gì?',
            options: ['Chuỗi đơn', 'Xoắn kép', 'Vòng tròn', 'Hình sao'],
            correct: 1,
            explanation: 'ADN có cấu trúc xoắn kép (double helix) gồm 2 mạch polynucleotide xoắn quanh nhau.',
          },
          {
            id: 'g9-2-2',
            question: 'Gen là gì?',
            options: ['Một đoạn của ARN', 'Một đoạn của ADN mang thông tin mã hóa cho một sản phẩm', 'Một loại protein', 'Một loại enzyme'],
            correct: 1,
            explanation: 'Gen là một đoạn ADN mang thông tin mã hóa cho một chuỗi polypeptide hoặc một phân tử ARN chức năng.',
          },
        ],
      },
    ],
  },
];
