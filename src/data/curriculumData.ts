// Full curriculum data for KHTN grades 6-9 (Kết nối tri thức)

export interface Lesson {
  id: string;
  name: string;
  summary?: string;
}

export interface Chapter {
  id: string;
  name: string;
  icon: string;
  subject: 'physics' | 'chemistry' | 'biology' | 'general';
  lessons: Lesson[];
}

export const subjectColors: Record<string, string> = {
  physics: 'bg-info/10 text-info',
  chemistry: 'bg-success/10 text-success',
  biology: 'bg-warning/10 text-warning',
  general: 'bg-primary/10 text-primary',
};

export interface GradeCurriculum {
  grade: number;
  chapters: Chapter[];
}

export const curriculumData: GradeCurriculum[] = [
  {
    grade: 6,
    chapters: [
      {
        id: 'g6-c1', name: 'Chương 1: Mở đầu về Khoa học tự nhiên', icon: 'menu_book', subject: 'general',
        lessons: [
          { id: 'g6-c1-l1', name: 'Bài 1: Giới thiệu về Khoa học tự nhiên', summary: 'KHTN tìm hiểu về tự nhiên, sự sống, vật chất, năng lượng.' },
          { id: 'g6-c1-l2', name: 'Bài 2: An toàn trong phòng thực hành', summary: 'Nguyên tắc an toàn và cách xử lí sự cố cơ bản.' },
          { id: 'g6-c1-l3', name: 'Bài 3: Sử dụng kính lúp', summary: 'Dụng cụ phóng đại, cách cầm và điều chỉnh tiêu cự.' },
          { id: 'g6-c1-l4', name: 'Bài 4: Sử dụng kính hiển vi quang học', summary: 'Phóng đại vật rất nhỏ, các bước chỉnh sáng và tiêu cự.' },
          { id: 'g6-c1-l5', name: 'Bài 5: Đo chiều dài', summary: 'Đơn vị mét (m); cách đặt thước, đọc đúng vạch chia.' },
          { id: 'g6-c1-l6', name: 'Bài 6: Đo khối lượng', summary: 'Đơn vị ki-lô-gam (kg); dùng cân và đọc chính xác.' },
          { id: 'g6-c1-l7', name: 'Bài 7: Đo thời gian', summary: 'Đơn vị giây (s); dùng đồng hồ bấm giờ, điểm bắt đầu/dừng.' },
          { id: 'g6-c1-l8', name: 'Bài 8: Đo nhiệt độ', summary: 'Đơn vị độ C (°C); cách dùng nhiệt kế đúng kỹ thuật.' },
        ],
      },
      {
        id: 'g6-c2', name: 'Chương 2: Chất quanh ta', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g6-c2-l1', name: 'Bài 9: Sự đa dạng của chất', summary: 'Chất có tính chất vật lí và tính chất hóa học.' },
          { id: 'g6-c2-l2', name: 'Bài 10: Các thể của chất và sự chuyển thể', summary: 'Ba thể rắn, lỏng, khí và các quá trình chuyển thể.' },
          { id: 'g6-c2-l3', name: 'Bài 11: Oxygen. Không khí', summary: 'Oxygen cần cho sự cháy; không khí là hỗn hợp nhiều khí.' },
        ],
      },
      {
        id: 'g6-c3', name: 'Chương 3: Vật liệu, nguyên liệu, nhiên liệu, lương thực', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g6-c3-l1', name: 'Bài 12: Một số vật liệu', summary: 'Tính chất riêng của kim loại, nhựa, thủy tinh...' },
          { id: 'g6-c3-l2', name: 'Bài 13: Một số nguyên liệu', summary: 'Dùng để sản xuất ra vật liệu và sản phẩm.' },
          { id: 'g6-c3-l3', name: 'Bài 14: Một số nhiên liệu', summary: 'Khi cháy tỏa nhiệt, dùng để đun nấu, phát điện.' },
          { id: 'g6-c3-l4', name: 'Bài 15: Một số lương thực, thực phẩm', summary: 'Nguồn dinh dưỡng, cần lựa chọn thực phẩm an toàn.' },
        ],
      },
      {
        id: 'g6-c4', name: 'Chương 4: Hỗn hợp. Tách chất ra khỏi hỗn hợp', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g6-c4-l1', name: 'Bài 16: Hỗn hợp các chất', summary: 'Gồm nhiều chất trộn lẫn, chưa phản ứng hóa học.' },
          { id: 'g6-c4-l2', name: 'Bài 17: Tách chất khỏi hỗn hợp', summary: 'Các cách: lọc, bay hơi, chiết, dùng nam châm.' },
        ],
      },
      {
        id: 'g6-c5', name: 'Chương 5: Tế bào', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g6-c5-l1', name: 'Bài 18: Tế bào – Đơn vị cơ bản của sự sống', summary: 'Tế bào là đơn vị nhỏ nhất cấu tạo nên cơ thể sống.' },
          { id: 'g6-c5-l2', name: 'Bài 19: Cấu tạo và chức năng các thành phần của tế bào', summary: 'Màng, chất tế bào, nhân giúp trao đổi chất, sinh trưởng.' },
          { id: 'g6-c5-l3', name: 'Bài 20: Sự lớn lên và sinh sản của tế bào', summary: 'Tế bào lớn lên rồi phân chia tạo tế bào mới.' },
          { id: 'g6-c5-l4', name: 'Bài 21: Thực hành: Quan sát và phân biệt một số loại tế bào', summary: 'Nhận biết hình dạng, cấu trúc tế bào biểu bì, tế bào động vật.' },
        ],
      },
      {
        id: 'g6-c6', name: 'Chương 6: Từ tế bào đến cơ thể', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g6-c6-l1', name: 'Bài 22: Cơ thể sinh vật', summary: 'Tập hợp các cơ quan có khả năng trao đổi chất, sinh trưởng.' },
          { id: 'g6-c6-l2', name: 'Bài 23: Tổ chức cơ thể đa bào', summary: 'Tế bào → mô → cơ quan → hệ cơ quan → cơ thể.' },
          { id: 'g6-c6-l3', name: 'Bài 24: Thực hành: Quan sát và mô tả cơ thể đơn bào, cơ thể đa bào', summary: 'So sánh sinh vật đơn bào và đa bào.' },
        ],
      },
      {
        id: 'g6-c7', name: 'Chương 7: Đa dạng thế giới sống', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g6-c7-l1', name: 'Bài 25: Hệ thống phân loại sinh vật', summary: 'Phân thành 5 giới: Vi khuẩn, Nguyên sinh, Nấm, Thực vật, Động vật.' },
          { id: 'g6-c7-l2', name: 'Bài 26: Khoá lưỡng phân', summary: 'Sơ đồ phân loại sinh vật theo từng cặp đặc điểm.' },
          { id: 'g6-c7-l3', name: 'Bài 27: Vi khuẩn', summary: 'Sinh vật đơn bào chưa có nhân hoàn chỉnh.' },
          { id: 'g6-c7-l4', name: 'Bài 28: Thực hành: Làm sữa chua và quan sát vi khuẩn', summary: 'Dùng vi khuẩn lactic để làm sữa chua và quan sát.' },
          { id: 'g6-c7-l5', name: 'Bài 29: Virus', summary: 'Dạng sống vô cùng nhỏ, sống kí sinh trong tế bào vật chủ.' },
          { id: 'g6-c7-l6', name: 'Bài 30: Nguyên sinh vật', summary: 'Đa dạng, gồm các loài quang hợp và dị dưỡng.' },
          { id: 'g6-c7-l7', name: 'Bài 31: Thực hành: Quan sát nguyên sinh vật', summary: 'Quan sát trùng giày, trùng roi dưới kính hiển vi.' },
          { id: 'g6-c7-l8', name: 'Bài 32: Nấm', summary: 'Nấm phân hủy, làm thức ăn hoặc gây bệnh.' },
          { id: 'g6-c7-l9', name: 'Bài 33: Thực hành: Quan sát các loại nấm', summary: 'Nhận dạng nấm mốc, nấm ăn.' },
          { id: 'g6-c7-l10', name: 'Bài 34: Thực vật', summary: 'Có khả năng quang hợp; gồm rêu, dương xỉ, hạt trần, hạt kín.' },
          { id: 'g6-c7-l11', name: 'Bài 35: Thực hành: Quan sát và phân biệt một số nhóm thực vật', summary: 'Nhận biết các cơ quan rễ, thân, lá, hoa, quả.' },
          { id: 'g6-c7-l12', name: 'Bài 36: Động vật', summary: 'Dị dưỡng, di chuyển được; chia thành động vật có/không xương.' },
          { id: 'g6-c7-l13', name: 'Bài 37: Thực hành: Quan sát và nhận biết một số nhóm động vật ngoài thiên nhiên', summary: 'Nhận dạng đa dạng động vật.' },
          { id: 'g6-c7-l14', name: 'Bài 38: Đa dạng sinh học', summary: 'Sự phong phú về loài và hệ sinh thái cần được bảo vệ.' },
          { id: 'g6-c7-l15', name: 'Bài 39: Tìm hiểu sinh vật ngoài thiên nhiên', summary: 'Ghi chép và tìm hiểu sinh vật quanh ta.' },
        ],
      },
      {
        id: 'g6-c8', name: 'Chương 8: Lực trong đời sống', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g6-c8-l1', name: 'Bài 40: Lực là gì?', summary: 'Tác dụng đẩy/kéo làm vật biến dạng hoặc đổi chuyển động.' },
          { id: 'g6-c8-l2', name: 'Bài 41: Biểu diễn lực', summary: 'Dùng véc tơ có điểm đặt, phương, chiều, độ lớn.' },
          { id: 'g6-c8-l3', name: 'Bài 42: Biến dạng của lò xo', summary: 'Lực lớn thì độ biến dạng lò xo càng lớn.' },
          { id: 'g6-c8-l4', name: 'Bài 43: Trọng lượng, lực hấp dẫn', summary: 'Trọng lực là lực hút của Trái Đất.' },
          { id: 'g6-c8-l5', name: 'Bài 44: Lực ma sát', summary: 'Lực cản xuất hiện ở bề mặt tiếp xúc.' },
          { id: 'g6-c8-l6', name: 'Bài 45: Lực cản của nước', summary: 'Nước tạo ra lực cản lên vật chuyển động trong nó.' },
        ],
      },
      {
        id: 'g6-c9', name: 'Chương 9: Năng lượng', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g6-c9-l1', name: 'Bài 46: Năng lượng và sự truyền năng lượng', summary: 'Đại lượng đặc trưng cho khả năng sinh công; có thể truyền đi.' },
          { id: 'g6-c9-l2', name: 'Bài 47: Một số dạng năng lượng', summary: 'Động năng, thế năng, nhiệt, điện, quang năng.' },
          { id: 'g6-c9-l3', name: 'Bài 48: Sự chuyển hoá năng lượng', summary: 'Chuyển hóa từ dạng này sang dạng khác, luôn bảo toàn.' },
          { id: 'g6-c9-l4', name: 'Bài 49: Năng lượng hao phí', summary: 'Phần năng lượng mất đi dưới dạng nhiệt, ma sát.' },
          { id: 'g6-c9-l5', name: 'Bài 50: Năng lượng tái tạo', summary: 'Năng lượng gió, mặt trời: sạch và liên tục.' },
          { id: 'g6-c9-l6', name: 'Bài 51: Tiết kiệm năng lượng', summary: 'Giúp bảo vệ môi trường và tài nguyên thiên nhiên.' },
        ],
      },
      {
        id: 'g6-c10', name: 'Chương 10: Trái đất và Bầu trời', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g6-c10-l1', name: 'Bài 52: Chuyển động nhìn thấy của Mặt Trời. Thiên thể', summary: 'Hệ tinh tú do Trái đất quay.' },
          { id: 'g6-c10-l2', name: 'Bài 53: Mặt Trăng', summary: 'Vệ tinh tự nhiên của Trái Đất, có nhiều pha sáng.' },
          { id: 'g6-c10-l3', name: 'Bài 54: Hệ Mặt Trời', summary: 'Gồm Mặt Trời, các hành tinh và vệ tinh.' },
          { id: 'g6-c10-l4', name: 'Bài 55: Ngân Hà', summary: 'Thiên hà khổng lồ chứa Hệ Mặt Trời.' },
        ],
      }
    ]
  },
  {
    grade: 7,
    chapters: [
      {
        id: 'g7-c1', name: 'Chương 1: Chất và sự biến đổi của chất', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g7-c1-l1', name: 'Bài 1: Phương pháp và kĩ năng học tập môn Khoa học tự nhiên', summary: 'Quan sát, đo, xử lí số liệu; quy trình tìm hiểu tự nhiên.' },
          { id: 'g7-c1-l2', name: 'Bài 2: Nguyên tử', summary: 'Hạt vô cùng nhỏ gồm nhân (p, n) và lớp vỏ electron.' },
          { id: 'g7-c1-l3', name: 'Bài 3: Nguyên tố hóa học', summary: 'Tập hợp nguyên tử cùng loại (cùng số proton).' },
          { id: 'g7-c1-l4', name: 'Bài 4: Sơ lược về bảng tuần hoàn các nguyên tố hóa học', summary: 'Sắp xếp theo số proton thành nhóm và chu kì.' },
          { id: 'g7-c1-l5', name: 'Bài 5: Phân tử', summary: 'Tập hợp nguyên tử liên kết, chia thành đơn chất và hợp chất.' },
          { id: 'g7-c1-l6', name: 'Bài 6: Giới thiệu về liên kết hóa học', summary: 'Liên kết ion và cộng hóa trị giúp nguyên tử bền vững.' },
          { id: 'g7-c1-l7', name: 'Bài 7: Hóa trị và công thức hóa học', summary: 'Thể hiện khả năng liên kết của nguyên tố để lập công thức.' },
        ],
      },
      {
        id: 'g7-c2', name: 'Chương 2: Tốc độ', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g7-c2-l1', name: 'Bài 8: Tốc độ chuyển động', summary: 'Mức độ nhanh/chậm (v=s/t); đơn vị m/s, km/h.' },
          { id: 'g7-c2-l2', name: 'Bài 9: Đo tốc độ', summary: 'Dùng đồng hồ bấm giây và thước hoặc cảm biến.' },
          { id: 'g7-c2-l3', name: 'Bài 10: Đồ thị quãng đường–thời gian', summary: 'Biểu diễn chuyển động trên đồ thị s-t.' },
          { id: 'g7-c2-l4', name: 'Bài 11: Thảo luận về ảnh hưởng của tốc độ trong an toàn giao thông', summary: 'Tốc độ cao cần khoảng cách phanh dài, tốn thời gian phản ứng.' },
        ],
      },
      {
        id: 'g7-c3', name: 'Chương 3: Âm học', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g7-c3-l1', name: 'Bài 12: Nguồn âm. Sóng âm', summary: 'Vật dao động tạo sóng truyền trong các môi trường.' },
          { id: 'g7-c3-l2', name: 'Bài 13: Độ to và độ cao của âm', summary: 'Biên độ quy định độ to; tần số quy định độ chói.' },
          { id: 'g7-c3-l3', name: 'Bài 14: Phản xạ âm. Ô nhiễm tiếng ồn', summary: 'Phản xạ âm sinh tiếng vọng; cần vật liệu cách âm chống ồn.' },
        ],
      },
      {
        id: 'g7-c4', name: 'Chương 4: Ánh sáng', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g7-c4-l1', name: 'Bài 15: Năng lượng ánh sáng. Tia sáng, vùng tối', summary: 'Ánh sáng truyền thẳng, tạo bóng và vùng nửa tối.' },
          { id: 'g7-c4-l2', name: 'Bài 16: Sự phản xạ ánh sáng', summary: 'Định luật phản xạ: góc tới bằng góc phản xạ.' },
          { id: 'g7-c4-l3', name: 'Bài 17: Ảnh của vật qua gương phẳng', summary: 'Tạo ảnh ảo, đối xứng và bằng vật.' },
        ],
      },
      {
        id: 'g7-c5', name: 'Chương 5: Điện', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g7-c5-l1', name: 'Bài 18: Nam châm', summary: 'Hút kim loại từ tính; có 2 cực Bắc - Nam từ đẩy / hút nhau.' },
          { id: 'g7-c5-l2', name: 'Bài 19: Từ trường', summary: 'Vùng không gian nơi từ lực tác dụng, có các đường sức từ.' },
          { id: 'g7-c5-l3', name: 'Bài 20: Chế tạo nam châm điện đơn giản', summary: 'Dùng cuộn dây lõi sắt mang dòng điện.' },
        ],
      },
      {
        id: 'g7-c6', name: 'Chương 6: Trao đổi chất và chuyển hóa năng lượng ở sinh vật', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g7-c6-l1', name: 'Bài 21: Khái quát về trao đổi chất và chuyển hóa năng lượng', summary: 'Biến đổi chất, tích lũy hoặc phát năng lượng.' },
          { id: 'g7-c6-l2', name: 'Bài 22: Quang hợp ở thực vật', summary: 'Tạo chất hữu cơ từ ánh sáng và nước-CO2.' },
          { id: 'g7-c6-l3', name: 'Bài 23: Hô hấp ở sinh vật', summary: 'Phân giải chất để xả năng lượng sinh ra ATP và CO2.' },
          { id: 'g7-c6-l4', name: 'Bài 24: Thực hành: Quan sát trao đổi khí ở thực vật', summary: 'Quan sát khí tạo ra từ quang hợp/hô hấp.' },
        ],
      },
      {
        id: 'g7-c7', name: 'Chương 7: Cảm ứng, sinh trưởng, sinh sản ở sinh vật', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g7-c7-l1', name: 'Bài 25: Cảm ứng ở sinh vật', summary: 'Khả năng phản ứng lại với các kích thích môi trường.' },
          { id: 'g7-c7-l2', name: 'Bài 26: Sinh trưởng và phát triển ở sinh vật', summary: 'Tăng lên về kích thước và tạo các cấu trúc, chức năng mới.' },
          { id: 'g7-c7-l3', name: 'Bài 27: Sinh sản vô tính ở sinh vật', summary: 'Nhân lên không cần giao phối, con giống cha mẹ.' },
          { id: 'g7-c7-l4', name: 'Bài 28: Sinh sản hữu tính ở sinh vật', summary: 'Kết hợp giao tử đực và dòng cái, tạo tính đa dạng sinh học.' },
          { id: 'g7-c7-l5', name: 'Bài 29: Điều hòa và phối hợp sinh sản', summary: 'Tiết chế bởi hormone và nhân tố bên ngoài.' },
          { id: 'g7-c7-l6', name: 'Bài 30: Ứng dụng sinh trưởng và phát triển ở sinh vật vào thực tiễn', summary: 'Chăm sóc cải tạo thực vật nuôi cấy.' },
        ],
      }
    ]
  },
  {
    grade: 8,
    chapters: [
      {
        id: 'g8-c1', name: 'Chương 1: Phản ứng hóa học', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g8-c1-l1', name: 'Bài 1: Sử dụng một số hóa chất, thiết bị cơ bản trong phòng thí nghiệm', summary: 'Biết nhận biết và cách dùng ống nghiệm, cốc, pipet, đèn cồn, rửa an toàn.' },
          { id: 'g8-c1-l2', name: 'Bài 2: Phản ứng hóa học', summary: 'Quá trình biến đổi chất này thành chất khác, có thể tạo ra khí, kết tủa, đổi màu, phát sáng, tỏa–thu nhiệt.' },
          { id: 'g8-c1-l3', name: 'Bài 3: Mol và tỉ khối chất khí', summary: 'Mol là đơn vị lượng chất chứa khoảng 6,02×10²³ hạt; tỉ khối cho biết khí nặng–nhẹ hơn khí khác.' },
          { id: 'g8-c1-l4', name: 'Bài 4: Dung dịch và nồng độ', summary: 'Nồng độ phần trăm, nồng độ mol mô tả mức độ đậm đặc, dùng để pha loãng hoặc pha đặc.' },
          { id: 'g8-c1-l5', name: 'Bài 5: Định luật bảo toàn khối lượng và phương trình hóa học', summary: 'Tổng khối lượng luôn bảo toàn; phương trình hóa học dùng công thức, cân bằng số nguyên tử.' },
          { id: 'g8-c1-l6', name: 'Bài 6: Tính theo phương trình hóa học', summary: 'Từ lượng một chất → tính lượng các chất còn lại trong phản ứng.' },
          { id: 'g8-c1-l7', name: 'Bài 7: Tốc độ phản ứng và chất xúc tác', summary: 'Tốc độ phụ thuộc nhiệt độ, nồng độ, diện tích bề mặt, áp suất, chất xúc tác.' },
        ],
      },
      {
        id: 'g8-c2', name: 'Chương 2: Một số hợp chất thông dụng', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g8-c2-l1', name: 'Bài 8: Acid', summary: 'Acid có vị chua, làm quỳ tím hóa đỏ, tác dụng với kim loại, bazơ, muối.' },
          { id: 'g8-c2-l2', name: 'Bài 9: Base. Thang pH', summary: 'Kiềm có vị đắng, trơn, làm quỳ hóa xanh; pH (acid < 7, trung tính = 7, kiềm > 7).' },
          { id: 'g8-c2-l3', name: 'Bài 10: Oxide', summary: 'Hợp chất của nguyên tố với oxygen, chia thành oxide axit và oxide bazơ.' },
          { id: 'g8-c2-l4', name: 'Bài 11: Muối', summary: 'Liên kết cation kim loại hoặc NH₄⁺ và anion gốc acid; có dạng ăn được, phân bón.' },
          { id: 'g8-c2-l5', name: 'Bài 12: Phân bón hóa học', summary: 'Cung cấp N, P, K cho cây; dùng phân hợp lý để tăng năng suất, hạn chế ô nhiễm.' },
        ],
      },
      {
        id: 'g8-c3', name: 'Chương 3: Khối lượng riêng và áp suất', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g8-c3-l1', name: 'Bài 13: Khối lượng riêng', summary: 'Đại lượng D=m/V đặc trưng độ đậm, nhẹ của vật liệu.' },
          { id: 'g8-c3-l2', name: 'Bài 14: Thực hành xác định khối lượng riêng', summary: 'Đo m bằng cân, V bằng bình chia độ; tính D=m/V cho vật rắn, lỏng.' },
          { id: 'g8-c3-l3', name: 'Bài 15: Áp suất trên một bề mặt', summary: 'Áp suất p=F/S, phụ thuộc lực tác dụng và diện tích bị ép.' },
          { id: 'g8-c3-l4', name: 'Bài 16: Áp suất chất lỏng. Áp suất khí quyển', summary: 'Áp suất lỏng tăng theo chiều sâu; áp suất khí quyển do lớp không khí tạo thành.' },
          { id: 'g8-c3-l5', name: 'Bài 17: Lực đẩy Archimedes', summary: 'Vật nhúng trong chất lỏng chịu lực đẩy Archimedes hướng lên, độ lớn bằng trọng lượng chất lỏng bị chiếm chỗ.' },
        ],
      },
      {
        id: 'g8-c4', name: 'Chương 4: Tác dụng làm quay của lực', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g8-c4-l1', name: 'Bài 18: Tác dụng làm quay của lực. Moment lực', summary: 'Lực làm quay vật quanh trục; moment lực M=F⋅d.' },
          { id: 'g8-c4-l2', name: 'Bài 19: Đòn bẩy và ứng dụng', summary: 'Đòn bẩy giúp giảm lực cần dùng để nâng–đẩy vật; ứng dụng đòn, kéo, kìm.' },
        ],
      },
      {
        id: 'g8-c5', name: 'Chương 5: Điện', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g8-c5-l1', name: 'Bài 20: Hiện tượng nhiễm điện do cọ xát', summary: 'Khi vật cọ xát, electron chuyển dịch tạo nhiễm điện âm/dương, hút vật nhé.' },
          { id: 'g8-c5-l2', name: 'Bài 21: Dòng điện, nguồn điện', summary: 'Dòng các điện tích chuyển động có hướng; pin, ắc-quy tạo ra hiệu điện thế.' },
          { id: 'g8-c5-l3', name: 'Bài 22: Mạch điện đơn giản', summary: 'Nguồn, dây dẫn, công tắc, bóng đèn; mạch kín có dòng điện.' },
          { id: 'g8-c5-l4', name: 'Bài 23: Tác dụng của dòng điện', summary: 'Có tác dụng nhiệt, phát sáng, từ, hóa học, sinh lí.' },
          { id: 'g8-c5-l5', name: 'Bài 24: Cường độ dòng điện và hiệu điện thế', summary: 'Cường độ (A), hiệu điện thế (V); dùng ampe kế, vôn kế để đo.' },
          { id: 'g8-c5-l6', name: 'Bài 25: Thực hành đo cường độ dòng điện và hiệu điện thế', summary: 'Mắc ampe kế nối tiếp, vôn kế song song; đọc giá trị.' },
        ],
      },
      {
        id: 'g8-c6', name: 'Chương 6: Nhiệt', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g8-c6-l1', name: 'Bài 26: Năng lượng nhiệt và nội năng', summary: 'Nhiệt năng liên quan đến chuyển động của phân tử; nội năng gồm động năng và thế năng phân tử.' },
          { id: 'g8-c6-l2', name: 'Bài 27: Thực hành đo năng lượng nhiệt bằng joulemeter', summary: 'Dùng joulemeter đo nhiệt lượng trao đổi, tính năng lượng nhiệt.' },
          { id: 'g8-c6-l3', name: 'Bài 28: Sự truyền nhiệt', summary: 'Nhiệt truyền bằng dẫn nhiệt, đối lưu, bức xạ.' },
          { id: 'g8-c6-l4', name: 'Bài 29: Sự nở vì nhiệt', summary: 'Chất giãn nở khi nóng lên, co lại khi lạnh đi.' },
        ],
      },
      {
        id: 'g8-c7', name: 'Chương 7: Sinh học – Cơ thể người', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g8-c7-l1', name: 'Bài 30: Khái quát về cơ thể người', summary: 'Tập hợp các hệ cơ quan phối hợp hoạt động.' },
          { id: 'g8-c7-l2', name: 'Bài 31: Hệ vận động ở người', summary: 'Xương và cơ nâng đỡ, bảo vệ và tạo chuyển động.' },
          { id: 'g8-c7-l3', name: 'Bài 32: Dinh dưỡng và tiêu hóa ở người', summary: 'Cơ quan tiêu hóa biến đổi thức ăn thành chất hấp thụ được.' },
          { id: 'g8-c7-l4', name: 'Bài 33: Máu và hệ tuần hoàn của cơ thể người', summary: 'Hệ tuần hoàn vận chuyển chất dinh dưỡng, khí, chất thải khắp cơ thể.' },
          { id: 'g8-c7-l5', name: 'Bài 34: Hệ hô hấp ở người', summary: 'Trao đổi khí O₂ và CO₂ với môi trường tự nhiên.' },
          { id: 'g8-c7-l6', name: 'Bài 35: Hệ bài tiết ở người', summary: 'Thận lọc máu tạo nước tiểu, da thải mồ hôi, phổi thải khí.' },
          { id: 'g8-c7-l7', name: 'Bài 36: Điều hòa môi trường trong của cơ thể người', summary: 'Giữ cân bằng nhiệt độ, pH, đường nhờ thần kinh và nội tiết.' },
          { id: 'g8-c7-l8', name: 'Bài 37: Hệ thần kinh và các giác quan ở người', summary: 'Tiếp nhận thông tin và điều khiển cơ quan.' },
          { id: 'g8-c7-l9', name: 'Bài 38: Hệ nội tiết ở người', summary: 'Tiết hormone điều hòa chuyển hóa, sinh trưởng và sinh dục.' },
          { id: 'g8-c7-l10', name: 'Bài 39: Da và điều hòa thân nhiệt ở người', summary: 'Bảo vệ, nhận cảm giác và tiết mồ hôi điều hòa thân nhiệt.' },
          { id: 'g8-c7-l11', name: 'Bài 40: Sinh sản ở người', summary: 'Tạo tinh trùng, trứng, quá trình thụ tinh tạo ra phôi.' },
        ],
      },
      {
        id: 'g8-c8', name: 'Chương 8: Sinh vật và môi trường', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g8-c8-l1', name: 'Bài 41: Môi trường và các nhân tố sinh thái', summary: 'Yếu tố vô sinh và hữu sinh tác động lên sinh vật.' },
          { id: 'g8-c8-l2', name: 'Bài 42: Quần thể sinh vật', summary: 'Nhóm cá thể cùng loài sống chung tại một khu vực.' },
          { id: 'g8-c8-l3', name: 'Bài 43: Quần xã sinh vật', summary: 'Nhiều quần thể khác loài tương tác (cạnh tranh, cộng sinh, kí sinh).' },
          { id: 'g8-c8-l4', name: 'Bài 44: Hệ sinh thái', summary: 'Quần xã và môi trường trao đổi vật chất, năng lượng.' },
          { id: 'g8-c8-l5', name: 'Bài 45: Sinh quyển', summary: 'Toàn bộ sinh vật trên Trái Đất và môi trường nuôi dưỡng chúng.' },
          { id: 'g8-c8-l6', name: 'Bài 46: Cân bằng tự nhiên', summary: 'Khả năng tự điều chỉnh mật độ của quần thể, cân bằng vật chất.' },
          { id: 'g8-c8-l7', name: 'Bài 47: Bảo vệ môi trường', summary: 'Giảm ô nhiễm, tiết kiệm tài nguyên và phát triển bền vững.' },
        ],
      }
    ]
  },
  {
    grade: 9,
    chapters: [
      {
        id: 'g9-c1', name: 'Chương 1: Năng lượng cơ học', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g9-c1-l1', name: 'Bài 1: Nhận biết một số dụng cụ, hoá chất. Thuyết trình một vấn đề khoa học', summary: 'Nhận biết ống nghiệm, ống đong, kẹp, đèn cồn, pin... Rèn kĩ năng thuyết trình.' },
          { id: 'g9-c1-l2', name: 'Bài 2: Động năng. Thế năng', summary: 'Năng lượng do chuyển động hoặc do vị trí, biến dạng.' },
          { id: 'g9-c1-l3', name: 'Bài 3: Cơ năng', summary: 'Cơ năng là tổng động năng và thế năng.' },
          { id: 'g9-c1-l4', name: 'Bài 4: Công và công suất', summary: 'Công A=F.s, công suất P=A/t; máy cơ.' },
        ],
      },
      {
        id: 'g9-c2', name: 'Chương 2: Ánh sáng', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g9-c2-l1', name: 'Bài 5: Khúc xạ ánh sáng', summary: 'Khi ánh sáng từ môi trường này sang môi trường khác thì đổi hướng.' },
          { id: 'g9-c2-l2', name: 'Bài 6: Phản xạ toàn phần', summary: 'Ánh sáng bị phản xạ hoàn toàn trở lại.' },
          { id: 'g9-c2-l3', name: 'Bài 7: Lăng kính', summary: 'Khối trong suốt ba mặt phẳng, làm lệch đường đi của tia sáng.' },
          { id: 'g9-c2-l4', name: 'Bài 8: Thấu kính', summary: 'Thấu kính hội tụ, thấu kính phân kì; dùng để tạo ảnh.' },
          { id: 'g9-c2-l5', name: 'Bài 9: Thực hành đo tiêu cự của thấu kính hội tụ', summary: 'Đo khoảng cách vật–ảnh và thấu kính, tính tiêu cự f.' },
          { id: 'g9-c2-l6', name: 'Bài 10: Kính lúp. Bài tập thấu kính', summary: 'Kính lúp phóng đại vật, cho ảnh ảo. Giải bài tập.' },
        ],
      },
      {
        id: 'g9-c3', name: 'Chương 3: Điện', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g9-c3-l1', name: 'Bài 11: Điện trở. Định luật Ohm', summary: 'Điện trở R cản trở dòng điện; định luật Ohm: I=U/R.' },
          { id: 'g9-c3-l2', name: 'Bài 12: Đoạn mạch nối tiếp, song song', summary: 'Đặc điểm I, U, R trong mạch nối tiếp và song song.' },
          { id: 'g9-c3-l3', name: 'Bài 13: Năng lượng của dòng điện và công suất điện', summary: 'Công A=UIt; công suất P=UI.' },
        ],
      },
      {
        id: 'g9-c4', name: 'Chương 4: Điện từ', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g9-c4-l1', name: 'Bài 14: Cảm ứng điện từ. Nguyên tắc tạo ra dòng điện xoay chiều', summary: 'Dòng điện xuất hiện khi từ thông qua cuộn dây biến đổi.' },
          { id: 'g9-c4-l2', name: 'Bài 15: Tác dụng của dòng điện xoay chiều', summary: 'Dòng xoay chiều gây nhiệt, phát sáng, từ tính, cơ học.' },
        ],
      },
      {
        id: 'g9-c5', name: 'Chương 5: Năng lượng với cuộc sống', icon: 'bolt', subject: 'physics',
        lessons: [
          { id: 'g9-c5-l1', name: 'Bài 16: Vòng năng lượng trên Trái Đất. Năng lượng hoá thạch', summary: 'Chuỗi năng lượng từ mặt trời thành hóa thạch.' },
          { id: 'g9-c5-l2', name: 'Bài 17: Một số dạng năng lượng tái tạo', summary: 'Gió, mặt trời, thủy điện, sinh khối: sạch, thay thế dài hạn.' },
        ],
      },
      {
        id: 'g9-c6', name: 'Chương 6: Kim loại. Sự khác nhau cơ bản giữa phi kim và kim loại', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g9-c6-l1', name: 'Bài 18: Tính chất chung của kim loại', summary: 'Dẫn điện, dẫn nhiệt tốt, dẻo, có ánh kim.' },
          { id: 'g9-c6-l2', name: 'Bài 19: Dãy hoạt động hoá học', summary: 'Sắp xếp mức độ phản ứng; kim loại trước đẩy kim loại sau.' },
          { id: 'g9-c6-l3', name: 'Bài 20: Tách kim loại và việc sử dụng hợp kim', summary: 'Luyện kim; hợp kim có tính chất tốt hơn kim loại tinh khiết.' },
          { id: 'g9-c6-l4', name: 'Bài 21: Sự khác nhau cơ bản giữa phi kim và kim loại', summary: 'Khác biệt về tính dẫn điện, dẻo, ánh kim.' },
        ],
      },
      {
        id: 'g9-c7', name: 'Chương 7: Giới thiệu về chất hữu cơ. Hydrocarbon và nguồn nhiên liệu', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g9-c7-l1', name: 'Bài 22: Giới thiệu về hợp chất hữu cơ', summary: 'Chứa cacbon, có trong thiên nhiên, cấu trúc thường có C-C, C-H.' },
          { id: 'g9-c7-l2', name: 'Bài 23: Alkane', summary: 'Hydrocarbon no, liên kết đơn, thành phần chính của nhiên liệu.' },
          { id: 'g9-c7-l3', name: 'Bài 24: Alkene', summary: 'Hydrocarbon có ít nhất một liên kết đôi C=C.' },
          { id: 'g9-c7-l4', name: 'Bài 25: Nguồn nhiên liệu', summary: 'Gỗ, than, khí đốt... cung cấp năng lượng nhưng có yếu tố ô nhiễm.' },
        ],
      },
      {
        id: 'g9-c8', name: 'Chương 8: Ethylic alcohol và Acetic acid', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g9-c8-l1', name: 'Bài 26: Ethylic alcohol', summary: 'Chất lỏng dễ cháy, là cồn công nghiệp và đồ uống.' },
          { id: 'g9-c8-l2', name: 'Bài 27: Acetic acid', summary: 'Acid hữu cơ, thành phần chính của giấm, ứng dụng thực phẩm.' },
        ],
      },
      {
        id: 'g9-c9', name: 'Chương 9: Lipid. Carbohydrate. Protein. Polymer', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g9-c9-l1', name: 'Bài 28: Lipid', summary: 'Nguồn dự trữ năng lượng (chất béo, dầu).' },
          { id: 'g9-c9-l2', name: 'Bài 29: Carbohydrate. Glucose và saccharose', summary: 'Đường đơn và đường đôi cung cấp năng lượng tế bào.' },
          { id: 'g9-c9-l3', name: 'Bài 30: Tinh bột và cellulose', summary: 'Chất dự trữ và chất cấu tạo vách tế bào thực vật.' },
          { id: 'g9-c9-l4', name: 'Bài 31: Protein', summary: 'Chuỗi amino acid cấu tạo enzyme, cơ bắp, kháng thể.' },
          { id: 'g9-c9-l5', name: 'Bài 32: Polymer', summary: 'Phân tử siêu lớn cấu tạo từ đơn phân (nhựa, tinh bột, cao su).' },
        ],
      },
      {
        id: 'g9-c10', name: 'Chương 10: Khai thác tài nguyên từ vỏ Trái Đất', icon: 'science', subject: 'chemistry',
        lessons: [
          { id: 'g9-c10-l1', name: 'Bài 33: Sơ lược về hoá học vỏ Trái Đất và khai thác tài nguyên từ vỏ Trái Đất', summary: 'Khái quát khoáng sản: đá, phi kim, kim loại.' },
          { id: 'g9-c10-l2', name: 'Bài 34: Khai thác đá vôi. Công nghiệp silicate', summary: 'Sử dụng CaCO3; công nghiệp làm xi măng, thủy tinh.' },
          { id: 'g9-c10-l3', name: 'Bài 35: Khai thác nhiên liệu hoá thạch. Nguồn carbon. Chu trình carbon và sự ấm lên toàn cầu', summary: 'Nguy cơ do đốt nhiên liệu tăng hiệu ứng nhà kính.' },
        ],
      },
      {
        id: 'g9-c11', name: 'Chương 11: Di truyền học Mendel. Cơ sở phân tử của hiện tượng di truyền', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g9-c11-l1', name: 'Bài 36: Khái quát về di truyền học', summary: 'Nghiên cứu quá trình truyền đạt tính trạng và biến dị.' },
          { id: 'g9-c11-l2', name: 'Bài 37: Các quy luật di truyền của Mendel', summary: 'Hiện tượng trội - lặn, phân li và phân li độc lập.' },
          { id: 'g9-c11-l3', name: 'Bài 38: Nucleic acid và gene', summary: 'ADN và RNA mang thông tin di truyền; gene mã hóa protein.' },
          { id: 'g9-c11-l4', name: 'Bài 39: Tái bản DNA và phiên mã tạo RNA', summary: 'Cơ chế ADN tự nhân đôi và truyền mã sang RNA.' },
          { id: 'g9-c11-l5', name: 'Bài 40: Dịch mã và mối quan hệ từ gene đến tính trạng', summary: 'RNA dịch mã thành chuỗi amino acid, protein quyết định tính trạng.' },
          { id: 'g9-c11-l6', name: 'Bài 41: Đột biến gene', summary: 'Thay đổi trình tự nucleotid, nguồn tạo ra alen mới.' },
        ],
      },
      {
        id: 'g9-c12', name: 'Chương 12: Di truyền nhiễm sắc thể', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g9-c12-l1', name: 'Bài 42: Nhiễm sắc thể và bộ nhiễm sắc thể', summary: 'Cấu trúc ARN-protein mang gene, đặc trưng loài.' },
          { id: 'g9-c12-l2', name: 'Bài 43: Nguyên phân và giảm phân', summary: 'Hai hình thức phân bào tạo sinh trưởng và sinh sản.' },
          { id: 'g9-c12-l3', name: 'Bài 44: Nhiễm sắc thể giới tính và cơ chế xác định giới tính', summary: 'Sự kết hợp NST giới tính quy định giới loài (XX, XY...).' },
          { id: 'g9-c12-l4', name: 'Bài 45: Di truyền liên kết', summary: 'Gene nằm trên cùng NST; sự hoán vị gene di truyền chéo.' },
          { id: 'g9-c12-l5', name: 'Bài 46: Đột biến nhiễm sắc thể', summary: 'Lỗi số lượng và cấu trúc NST thường mang bệnh lí.' },
        ],
      },
      {
        id: 'g9-c13', name: 'Chương 13: Di truyền học với con người và đời sống', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g9-c13-l1', name: 'Bài 47: Di truyền học với con người', summary: 'Giải thích bệnh, đặc điểm máu, rủi ro gen dòng tộc.' },
          { id: 'g9-c13-l2', name: 'Bài 48: Ứng dụng công nghệ di truyền vào đời sống', summary: 'Tạo giống năng suất cao bằng Công nghệ sinh học.' },
        ],
      },
      {
        id: 'g9-c14', name: 'Chương 14: Tiến hóa', icon: 'eco', subject: 'biology',
        lessons: [
          { id: 'g9-c14-l1', name: 'Bài 49: Khái niệm tiến hoá và các hình thức chọn lọc', summary: 'Thay đổi hệ gene và tính trạng thích nghi; tự nhiên và nhân tạo.' },
          { id: 'g9-c14-l2', name: 'Bài 50: Cơ chế tiến hoá', summary: 'Đột biến, giao phối, di - nhập gene làm hình thành loài mới.' },
          { id: 'g9-c14-l3', name: 'Bài 51: Sự phát sinh và phát triển sự sống trên Trái Đất', summary: 'Từ tiến hóa hóa học, tiền sinh học tới động, thực vật, con người.' },
        ],
      }
    ]
  }
];
