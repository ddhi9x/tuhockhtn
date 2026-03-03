import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from './MaterialIcon';
import { supabase } from '@/integrations/supabase/client';

interface SimulationPanelProps {
  lessonId: string;
  lessonName: string;
  grade: number;
  filterType?: 'iframe' | 'simulation';
}

// ─── Built-in simulation components ───

const FrictionSim = () => {
  const [force, setForce] = useState(50);
  const [surface, setSurface] = useState<'smooth' | 'rough' | 'ice'>('smooth');
  const frictionCoeff = surface === 'ice' ? 0.05 : surface === 'smooth' ? 0.3 : 0.7;
  const frictionForce = force * frictionCoeff;
  const netForce = Math.max(0, force - frictionForce);
  const acceleration = netForce / 10;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-4">⚙️ Điều chỉnh thông số</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Lực kéo: {force}N</label>
            <input type="range" min={0} max={100} value={force} onChange={e => setForce(+e.target.value)} className="w-full mt-1 accent-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bề mặt:</label>
            <div className="flex gap-2 mt-1">
              {(['ice', 'smooth', 'rough'] as const).map(s => (
                <button key={s} onClick={() => setSurface(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${surface === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {s === 'ice' ? '🧊 Băng' : s === 'smooth' ? '🟢 Nhẵn' : '🟤 Nhám'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="relative h-40 bg-gradient-to-b from-info/5 to-muted/30 rounded-lg overflow-hidden">
          <div className={`absolute bottom-0 w-full h-8 ${surface === 'ice' ? 'bg-info/20' : surface === 'smooth' ? 'bg-success/20' : 'bg-warning/30'}`} />
          <motion.div animate={{ x: acceleration > 0 ? [0, 20, 0] : 0 }} transition={{ duration: 1, repeat: Infinity }}
            className="absolute bottom-8 left-1/3 w-16 h-16 bg-primary rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground text-xs font-bold">10kg</span>
          </motion.div>
          <div className="absolute bottom-14 left-[calc(33%+70px)] flex items-center">
            <div className="h-0.5 bg-destructive" style={{ width: `${force * 0.8}px` }} />
            <div className="text-destructive text-[10px] ml-1">F={force}N →</div>
          </div>
          <div className="absolute bottom-10 left-[calc(33%-10px)] flex items-center flex-row-reverse">
            <div className="h-0.5 bg-warning" style={{ width: `${frictionForce * 0.8}px` }} />
            <div className="text-warning text-[10px] mr-1">← f={frictionForce.toFixed(1)}N</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Hệ số ma sát</p>
          <p className="text-lg font-bold text-primary">{frictionCoeff}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Lực ma sát</p>
          <p className="text-lg font-bold text-warning">{frictionForce.toFixed(1)}N</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Gia tốc</p>
          <p className="text-lg font-bold text-success">{acceleration.toFixed(2)} m/s²</p>
        </div>
      </div>
      <div className="bg-info/5 border border-info/20 rounded-xl p-4">
        <p className="text-xs font-medium text-info mb-1">📝 Công thức</p>
        <p className="text-sm">F<sub>ms</sub> = μ × N = {frictionCoeff} × {force}N = {frictionForce.toFixed(1)}N</p>
        <p className="text-sm mt-1">a = F<sub>net</sub> / m = {netForce.toFixed(1)} / 10 = {acceleration.toFixed(2)} m/s²</p>
      </div>
    </div>
  );
};

const PHScaleSim = () => {
  const [ph, setPh] = useState(7);
  const getColor = (p: number) => {
    if (p < 3) return '#ff0000'; if (p < 5) return '#ff8800'; if (p < 6) return '#ffdd00';
    if (p < 7) return '#bbff00'; if (p === 7) return '#00ff00'; if (p < 9) return '#00ddbb';
    if (p < 11) return '#0088ff'; if (p < 13) return '#4400ff'; return '#8800aa';
  };
  const getType = (p: number) => p < 7 ? 'Acid (axit)' : p === 7 ? 'Trung tính' : 'Base (bazơ)';
  const getExample = (p: number) => {
    if (p <= 1) return 'Acid HCl đậm đặc'; if (p <= 2) return 'Dịch vị dạ dày';
    if (p <= 3) return 'Giấm, nước chanh'; if (p <= 4) return 'Nước cam';
    if (p <= 5) return 'Cà phê'; if (p <= 6) return 'Sữa'; if (p <= 7) return 'Nước tinh khiết';
    if (p <= 8) return 'Nước biển'; if (p <= 9) return 'Xà phòng nhẹ';
    if (p <= 10) return 'Thuốc kháng acid'; if (p <= 11) return 'Ammonia';
    if (p <= 12) return 'Nước vôi'; if (p <= 13) return 'Thuốc tẩy'; return 'NaOH đậm đặc';
  };
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-4">🧪 Thang đo pH</h3>
        <div className="relative">
          <div className="h-8 rounded-full" style={{ background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffdd00, #bbff00, #00ff00, #00ddbb, #0088ff, #4400ff, #8800aa)' }} />
          <input type="range" min={0} max={14} step={1} value={ph} onChange={e => setPh(+e.target.value)} className="w-full mt-2 accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0</span><span>7</span><span>14</span></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg" style={{ backgroundColor: getColor(ph) }}>{ph}</div>
        <p className="font-bold text-lg">{getType(ph)}</p>
        <p className="text-sm text-muted-foreground mt-1">Ví dụ: {getExample(ph)}</p>
      </div>
      <div className="bg-info/5 border border-info/20 rounded-xl p-4">
        <p className="text-xs font-medium text-info mb-1">📝 Kiến thức</p>
        <p className="text-sm">• pH &lt; 7: Acid – có vị chua, làm quỳ tím hóa đỏ</p>
        <p className="text-sm">• pH = 7: Trung tính – nước nguyên chất</p>
        <p className="text-sm">• pH &gt; 7: Base – có vị đắng, trơn nhờn, quỳ tím hóa xanh</p>
      </div>
    </div>
  );
};

const AtomSim = () => {
  const [element, setElement] = useState<'H' | 'He' | 'Li' | 'C' | 'O' | 'Na'>('C');
  const elements = {
    H: { name: 'Hydrogen', protons: 1, neutrons: 0, electrons: [1], mass: 1 },
    He: { name: 'Helium', protons: 2, neutrons: 2, electrons: [2], mass: 4 },
    Li: { name: 'Lithium', protons: 3, neutrons: 4, electrons: [2, 1], mass: 7 },
    C: { name: 'Carbon', protons: 6, neutrons: 6, electrons: [2, 4], mass: 12 },
    O: { name: 'Oxygen', protons: 8, neutrons: 8, electrons: [2, 6], mass: 16 },
    Na: { name: 'Sodium', protons: 11, neutrons: 12, electrons: [2, 8, 1], mass: 23 },
  };
  const el = elements[element];
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-3">⚛️ Chọn nguyên tố</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(elements) as Array<keyof typeof elements>).map(key => (
            <button key={key} onClick={() => setElement(key)}
              className={`w-12 h-12 rounded-lg text-sm font-bold transition-all ${element === key ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="relative w-64 h-64 mx-auto">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-destructive/80 flex items-center justify-center shadow-lg z-10">
            <div className="text-center">
              <span className="text-white font-bold text-lg">{element}</span>
              <p className="text-white/70 text-[8px]">{el.protons}p+ {el.neutrons}n</p>
            </div>
          </div>
          {el.electrons.map((count, shell) => {
            const radius = 50 + shell * 35;
            return (
              <React.Fragment key={shell}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/30"
                  style={{ width: radius * 2, height: radius * 2 }} />
                {Array.from({ length: count }).map((_, i) => {
                  const angle = (i / count) * Math.PI * 2;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <motion.div key={`${shell}-${i}`} animate={{ rotate: 360 }}
                      transition={{ duration: 3 + shell * 2, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', top: `calc(50% + ${y}px - 5px)`, left: `calc(50% + ${x}px - 5px)`, transformOrigin: `${-x}px ${-y}px` }}
                      className="w-2.5 h-2.5 rounded-full bg-info shadow-md" />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Số proton (Z)</p><p className="text-xl font-bold text-destructive">{el.protons}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Số neutron</p><p className="text-xl font-bold text-muted-foreground">{el.neutrons}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Số electron</p><p className="text-xl font-bold text-info">{el.electrons.reduce((a, b) => a + b, 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Số khối (A)</p><p className="text-xl font-bold text-primary">{el.mass}</p>
        </div>
      </div>
    </div>
  );
};

const StatesOfMatterSim = () => {
  const [temp, setTemp] = useState(25);
  const state = temp <= 0 ? 'solid' : temp < 100 ? 'liquid' : 'gas';
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-3">🌡️ Nhiệt độ: {temp}°C</h3>
        <input type="range" min={-30} max={150} value={temp} onChange={e => setTemp(+e.target.value)} className="w-full accent-primary" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>-30°C</span><span>0°C</span><span>100°C</span><span>150°C</span></div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden" style={{
          background: state === 'solid' ? 'hsl(var(--info)/0.2)' : state === 'liquid' ? 'hsl(var(--info)/0.3)' : 'hsl(var(--muted)/0.3)'
        }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i} className={`absolute w-3 h-3 rounded-full ${state === 'solid' ? 'bg-info' : state === 'liquid' ? 'bg-info/80' : 'bg-muted-foreground/50'}`}
              animate={state === 'solid' ? { x: (i % 5) * 35 + 15, y: Math.floor(i / 5) * 35 + 25 }
                : state === 'liquid' ? { x: [Math.random() * 150 + 10, Math.random() * 150 + 10], y: [100 + Math.random() * 40, 100 + Math.random() * 40] }
                  : { x: [Math.random() * 160, Math.random() * 160], y: [Math.random() * 160, Math.random() * 160] }}
              transition={{ duration: state === 'solid' ? 0.5 : state === 'liquid' ? 2 : 1, repeat: Infinity, repeatType: 'reverse' }} />
          ))}
        </div>
        <p className="text-center mt-4 font-bold text-lg">
          {state === 'solid' ? '🧊 Rắn' : state === 'liquid' ? '💧 Lỏng' : '♨️ Khí'}
        </p>
      </div>
      <div className="bg-info/5 border border-info/20 rounded-xl p-4">
        <p className="text-xs font-medium text-info mb-1">📝 Đặc điểm</p>
        {state === 'solid' && <p className="text-sm">Các hạt sắp xếp chặt chẽ, chỉ dao động tại chỗ. Có hình dạng và thể tích xác định.</p>}
        {state === 'liquid' && <p className="text-sm">Các hạt ở gần nhau nhưng di chuyển tự do. Có thể tích xác định nhưng không có hình dạng cố định.</p>}
        {state === 'gas' && <p className="text-sm">Các hạt di chuyển tự do, khoảng cách xa nhau. Không có hình dạng và thể tích xác định.</p>}
      </div>
    </div>
  );
};

const CellSim = () => {
  const [cellType, setCellType] = useState<'animal' | 'plant'>('animal');
  const parts = cellType === 'animal'
    ? [
      { name: 'Màng tế bào', desc: 'Bao bọc, bảo vệ, kiểm soát chất ra vào', color: 'bg-primary/60' },
      { name: 'Nhân', desc: 'Chứa ADN, điều khiển hoạt động tế bào', color: 'bg-destructive/60' },
      { name: 'Tế bào chất', desc: 'Chứa các bào quan', color: 'bg-info/30' },
      { name: 'Ti thể', desc: 'Hô hấp tế bào, tạo năng lượng ATP', color: 'bg-warning/60' },
      { name: 'Ribosome', desc: 'Tổng hợp protein', color: 'bg-success/60' },
      { name: 'Lưới nội chất', desc: 'Vận chuyển chất trong tế bào', color: 'bg-primary/40' },
    ]
    : [
      { name: 'Thành tế bào', desc: 'Bảo vệ, tạo hình dạng cố định (cellulose)', color: 'bg-success/80' },
      { name: 'Màng tế bào', desc: 'Bên trong thành, kiểm soát chất ra vào', color: 'bg-primary/60' },
      { name: 'Nhân', desc: 'Chứa ADN, điều khiển hoạt động', color: 'bg-destructive/60' },
      { name: 'Lục lạp', desc: 'Quang hợp, chứa diệp lục', color: 'bg-success/60' },
      { name: 'Không bào lớn', desc: 'Dự trữ nước và chất dinh dưỡng', color: 'bg-info/40' },
      { name: 'Ti thể', desc: 'Hô hấp tế bào', color: 'bg-warning/60' },
    ];
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-3">🔬 Loại tế bào</h3>
        <div className="flex gap-2">
          <button onClick={() => setCellType('animal')} className={`px-4 py-2 rounded-lg text-sm font-medium ${cellType === 'animal' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>🐾 Tế bào động vật</button>
          <button onClick={() => setCellType('plant')} className={`px-4 py-2 rounded-lg text-sm font-medium ${cellType === 'plant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>🌱 Tế bào thực vật</button>
        </div>
      </div>
      <div className="grid gap-2">
        {parts.map((part, i) => (
          <motion.div key={part.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${part.color} shrink-0`} />
            <div>
              <p className="font-medium text-sm">{part.name}</p>
              <p className="text-xs text-muted-foreground">{part.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CircuitSim = () => {
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(100);
  const current = voltage / resistance;
  const power = voltage * current;
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-4">⚡ Mạch điện đơn giản</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hiệu điện thế: {voltage}V</label>
            <input type="range" min={1} max={24} value={voltage} onChange={e => setVoltage(+e.target.value)} className="w-full mt-1 accent-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Điện trở: {resistance}Ω</label>
            <input type="range" min={10} max={1000} step={10} value={resistance} onChange={e => setResistance(+e.target.value)} className="w-full mt-1 accent-primary" />
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="relative w-56 h-40 mx-auto">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-foreground/40" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/40" />
          <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-foreground/40" />
          <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-foreground/40" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 bg-card border-2 border-primary rounded-lg px-2 py-1">
            <span className="text-xs font-bold text-primary">🔋{voltage}V</span>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border-2 border-warning rounded-lg px-2 py-1">
            <span className="text-xs font-bold text-warning">{resistance}Ω</span>
          </div>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1 / (current * 10 + 0.1), repeat: Infinity }}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-info text-xl">⚡→</motion.div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Cường độ (I)</p>
          <p className="text-lg font-bold text-info">{(current * 1000).toFixed(1)}mA</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Công suất (P)</p>
          <p className="text-lg font-bold text-warning">{(power * 1000).toFixed(1)}mW</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Hiệu điện thế</p>
          <p className="text-lg font-bold text-primary">{voltage}V</p>
        </div>
      </div>
      <div className="bg-info/5 border border-info/20 rounded-xl p-4">
        <p className="text-xs font-medium text-info mb-1">📝 Định luật Ohm</p>
        <p className="text-sm">I = U / R = {voltage} / {resistance} = {current.toFixed(4)} A = {(current * 1000).toFixed(1)} mA</p>
        <p className="text-sm mt-1">P = U × I = {voltage} × {current.toFixed(4)} = {power.toFixed(4)} W</p>
      </div>
    </div>
  );
};

// ─── External iframe simulation ───

const IframeSim = ({ lessonId, config }: { lessonId: string; config: any }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const iframeUrl = config?.url || (config?.htmlFile ? `/lessons/${config.htmlFile}?lessonId=${lessonId}` : '/lessons/sample_lesson.html');

  useEffect(() => {
    // Nếu là URL từ Supabase (có chứa supabase.co/storage) thì nên fetch content để hiển thị đúng HTML
    if (iframeUrl.startsWith('http') && (iframeUrl.includes('supabase.co') || iframeUrl.includes('supabase.net'))) {
      setIsLoading(true);
      fetch(iframeUrl)
        .then(res => res.text())
        .then(text => {
          setHtmlContent(text);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching HTML:', err);
          setIsLoading(false);
        });
    } else {
      setHtmlContent(null);
    }
  }, [iframeUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: ensure the message comes from the same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'SIMULATION_RESULT') {
        const { score, details } = event.data;
        console.log('Received simulation result:', event.data);

        // Show success toast
        import('sonner').then(({ toast }) => {
          toast.success(`Đã nhận kết quả từ mô phỏng: ${score} điểm!`, {
            description: details?.message || 'Kết quả của bạn đã được ghi lại.'
          });
        });

        // Here we could also sync with Supabase or AppContext
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-230px)] flex flex-col items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border transition-all">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-muted-foreground font-medium">Đang tải nội dung bài học...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-230px)] bg-white rounded-xl shadow-sm overflow-hidden border border-border/50">
      <iframe
        src={!htmlContent ? iframeUrl : undefined}
        srcDoc={htmlContent || undefined}
        title="Interactive Simulation"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

// ─── Registry ───

const simComponentMap: Record<string, { defaultTitle: string; component: React.FC<any> }> = {
  friction: { defaultTitle: 'Mô phỏng Lực ma sát', component: FrictionSim },
  ph_scale: { defaultTitle: 'Mô phỏng Thang pH', component: PHScaleSim },
  atom: { defaultTitle: 'Mô phỏng Cấu tạo Nguyên tử', component: AtomSim },
  states_of_matter: { defaultTitle: 'Mô phỏng Các thể của chất', component: StatesOfMatterSim },
  cell: { defaultTitle: 'Mô phỏng Cấu tạo Tế bào', component: CellSim },
  circuit: { defaultTitle: 'Mô phỏng Mạch điện', component: CircuitSim },
  iframe: { defaultTitle: 'Mô phỏng tương tác', component: IframeSim },
};

// Auto-detect fallback (used when no DB records exist)
const autoDetect = (lessonName: string): string | null => {
  const name = lessonName.toLowerCase();
  if (name.includes('lực') && name.includes('ma sát')) return 'friction';
  if (name.includes('mạch điện') || name.includes('dòng điện')) return 'circuit';
  if (name.includes('acid') || name.includes('base') || name.includes('ph')) return 'ph_scale';
  if (name.includes('nguyên tử')) return 'atom';
  if (name.includes('thể của chất') || name.includes('chuyển thể')) return 'states_of_matter';
  if (name.includes('tế bào') && name.includes('cấu tạo')) return 'cell';
  if (name.includes('phản ứng hóa học') || name.includes('biến đổi hóa học')) return 'ph_scale';
  if (name.includes('dung dịch') || name.includes('nồng độ')) return 'ph_scale';
  return null;
};

// ─── Main Panel ───

interface SimEntry {
  id: string;
  sim_type: string;
  title: string;
  description: string | null;
  config?: any;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ lessonId, lessonName, grade, filterType }) => {
  const [dbSims, setDbSims] = useState<SimEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSimIndex, setActiveSimIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lesson_simulations')
        .select('id, sim_type, title, description, config')
        .eq('lesson_id', lessonId)
        .eq('is_active', true)
        .order('sort_order');
      if (data && data.length > 0) {
        setDbSims(data as SimEntry[]);
      }
      setLoading(false);
    };
    fetch();
  }, [lessonId]);

  // Determine simulations to show based on filterType
  let filteredDbSims = dbSims;
  if (filterType === 'iframe') {
    filteredDbSims = dbSims.filter(s => s.sim_type === 'iframe');
  } else if (filterType === 'simulation') {
    filteredDbSims = dbSims.filter(s => s.sim_type !== 'iframe');
  }

  const simEntries: SimEntry[] = filteredDbSims.length > 0
    ? filteredDbSims
    : (() => {
      // If we are strictly looking for iframe, don't fallback to phet simulations
      if (filterType === 'iframe') return [];

      const detected = autoDetect(lessonName);
      if (detected && simComponentMap[detected]) {
        return [{ id: 'auto', sim_type: detected, title: simComponentMap[detected].defaultTitle, description: null }];
      }
      return [];
    })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (simEntries.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <MaterialIcon name="science" size={40} className="text-muted-foreground/30" />
        </div>
        <h2 className="text-lg font-bold mb-2">Chưa có mô phỏng</h2>
        <p className="text-sm text-muted-foreground">
          Mô phỏng cho bài "{lessonName}" sẽ được cập nhật bởi admin.
        </p>
      </div>
    );
  }

  const currentSim = simEntries[activeSimIndex];
  const comp = simComponentMap[currentSim?.sim_type];
  if (!comp) return null;
  const SimComponent = comp.component;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with sim selector if multiple */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MaterialIcon name="science" size={22} className="text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold">{currentSim.title}</h2>
          {currentSim.description && <p className="text-xs text-muted-foreground">{currentSim.description}</p>}
        </div>
      </div>

      {/* Tabs if multiple simulations */}
      {simEntries.length > 1 && (
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {simEntries.map((sim, i) => (
            <button key={sim.id} onClick={() => setActiveSimIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeSimIndex === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
              {sim.title}
            </button>
          ))}
        </div>
      )}

      <SimComponent lessonId={lessonId} config={currentSim.config} />
    </div>
  );
};

export default SimulationPanel;
