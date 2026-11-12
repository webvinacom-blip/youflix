import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// --- Cấu hình Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCFHM0yidEmIRU0DgSsYr721J1QfRFQJ0M",
  authDomain: "youflix-shared.firebaseapp.com",
  projectId: "youflix-shared",
  storageBucket: "youflix-shared.appspot.com",
  messagingSenderId: "309437656302",
  appId: "1:309437656302:web:4365301530338d0a1c97ff",
  measurementId: "G-QGZG1IMPZR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
let appId = 'youflix-shared-room-v3';
let useCloud = true;

// --- Icons ---
const Search = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const Plus = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const X = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const Play = ({ size = 24, className = "", fill = "none" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const Info = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
const ChevronLeft = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const ChevronRight = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const Trash2 = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const CheckCircle = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const Minimize2 = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
);
const Maximize2 = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
);

// --- Utility Functions ---
const extractYoutubeId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
};

const extractPlaylistId = (urlOrId) => {
  if (!urlOrId) return '';
  try {
    if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
      const urlObj = new URL(urlOrId);
      return urlObj.searchParams.get('list') || urlOrId;
    }
  } catch (e) {}
  return urlOrId;
};

const getThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
const getHighResThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const detectIsFull = (title, description = '') => {
  const keywords = ['trọn bộ', 'tập cuối', 'end', 'hoàn tất'];
  const textToScan = (title + ' ' + description).toLowerCase();
  const fullRegex = /full(?!\s*(version|part|phần|tập|season|mùa|ss|p|pt|-)\s*\d+)(?!\s+\d{1,2}\b)/;
  return fullRegex.test(textToScan) || keywords.some(kw => textToScan.includes(kw));
};

// --- Initial Data ---
const initialMovies = [
  { id: '1', videoId: 'TcMBFSGVi1c', title: 'Avengers: Endgame - Trailer', category: 'Hành động', description: 'Trailer chính thức của bom tấn.', isFull: false },
  { id: '2', videoId: 'd9MyW72ELq0', title: 'Avatar: The Way of Water - Full End', category: 'Khoa học viễn tưởng', description: 'Trọn bộ Avatar.', isFull: true },
  { id: '3', videoId: 'aqz-KE-bpKQ', title: 'Big Buck Bunny 60fps 4K', category: 'Hoạt hình', description: 'Phim ngắn 3D mã nguồn mở nổi tiếng Big Buck Bunny.', isFull: false },
  { id: '4', videoId: '8Qn_spdM5Zg', title: 'Star Wars: Trọn bộ vietsub', category: 'Khoa học viễn tưởng', description: 'Star Wars: Thần Lực Thức Tỉnh.', isFull: true },
];

// --- Components ---

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 p-6">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 mb-6 text-xs md:text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition font-medium text-sm">Hủy</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold transition text-sm">Xác nhận xóa</button>
        </div>
      </div>
    </div>
  );
}

function Navbar({ categories, currentCategory, setCategory, searchQuery, setSearchQuery, onOpenAdd, showOnlyFull, setShowOnlyFull, onNavigate }) {
  const handleNavClick = (cat) => {
    setCategory(cat);
    setSearchQuery('');
    if (onNavigate) onNavigate(); 
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent pb-6 pt-3 md:pt-4 px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 transition-all duration-300 pointer-events-none">
      <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto overflow-hidden pointer-events-auto">
        <h1 className="text-red-600 font-black text-2xl md:text-3xl tracking-tighter cursor-pointer shrink-0" onClick={() => handleNavClick('Tất cả')}>
          YOUFLIX
        </h1>
        <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-1 md:pb-0">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => handleNavClick(cat)}
              className={`text-xs md:text-sm font-medium transition shrink-0 ${currentCategory === cat ? 'text-white' : 'text-zinc-300 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 w-full md:w-auto pointer-events-auto">
        <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer text-xs md:text-sm font-medium text-zinc-300 hover:text-white transition bg-black/40 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-zinc-700">
          <input 
            type="checkbox" 
            checked={showOnlyFull} 
            onChange={(e) => setShowOnlyFull(e.target.checked)}
            className="w-3.5 h-3.5 md:w-4 md:h-4 accent-red-600"
          />
          Chỉ hiện phim đã Full
        </label>
        
        <div className="relative flex-1 md:w-64 min-w-[140px]">
          <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-[18px] md:h-[18px]" />
          <input 
            type="text" 
            placeholder="Tìm kiếm phim..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-zinc-700 text-white rounded-full py-1 md:py-1.5 pl-8 md:pl-10 pr-3 md:pr-4 focus:outline-none focus:border-white transition placeholder:text-zinc-500 text-xs md:text-sm"
          />
        </div>
        
        <button 
          onClick={onOpenAdd}
          className="flex items-center justify-center gap-1 md:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full font-medium text-xs md:text-sm transition shrink-0"
        >
          <Plus size={16} className="md:w-[18px] md:h-[18px]" />
          <span className="hidden sm:inline">Thêm Phim</span>
        </button>
      </div>
    </nav>
  );
}

function Hero({ movie, onPlay }) {
  if (!movie) return null;
  
  return (
    <div className="relative w-full h-[60vh] md:h-[70vh] min-h-[400px] md:min-h-[500px] mb-6 md:mb-8">
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={getHighResThumbnail(movie.videoId)} 
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 md:from-black/80 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 md:via-transparent to-transparent"></div>
      </div>
      
      <div className="absolute bottom-[10%] md:bottom-[15%] left-4 md:left-16 max-w-2xl px-4 md:px-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-4">
          <span className="text-green-500 font-bold text-xs md:text-sm">98% Phù hợp</span>
          <span className="border border-zinc-500 text-zinc-300 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-sm">4K</span>
          {movie.isFull && <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-sm uppercase tracking-wider">Đã Full</span>}
          <span className="text-zinc-300 text-xs md:text-sm">{movie.category}</span>
        </div>
        <h2 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4 leading-tight shadow-sm line-clamp-2">
          {movie.title}
        </h2>
        <p className="text-sm md:text-lg text-zinc-300 mb-4 md:mb-8 line-clamp-3 max-w-xl text-shadow">
          {movie.description || "Một tuyệt tác đáng xem trên nền tảng của chúng tôi. Hãy tận hưởng những giây phút giải trí tuyệt vời."}
        </p>
        
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-1 md:gap-2 bg-white text-black px-4 md:px-8 py-1.5 md:py-2.5 rounded hover:bg-white/80 transition font-bold text-sm md:text-lg"
          >
            <Play size={18} className="md:w-6 md:h-6" fill="currentColor" /> Phát ngay
          </button>
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-1 md:gap-2 bg-zinc-500/50 text-white px-4 md:px-8 py-1.5 md:py-2.5 rounded hover:bg-zinc-500/70 transition font-bold text-sm md:text-lg backdrop-blur-sm"
          >
            <Info size={18} className="md:w-6 md:h-6" /> Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ movie, onClick, onDelete, className = "flex-none w-[140px] sm:w-[160px] md:w-64" }) {
  return (
    <div 
      className={`group/card relative aspect-video rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 bg-zinc-800 ${className}`}
      onClick={() => onClick(movie)}
    >
      <img 
        src={getThumbnail(movie.videoId)} 
        alt={movie.title} 
        className="w-full h-full object-cover" 
        loading="lazy"
      />
      {movie.isFull && (
        <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-red-600 text-white text-[8px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-sm shadow z-10">
          FULL
        </div>
      )}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
        className="absolute top-1 right-1 md:top-2 md:right-2 bg-black/60 hover:bg-red-600 text-white p-1 md:p-1.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-all z-20"
        title="Xóa phim"
      >
        <Trash2 size={14} className="md:w-4 md:h-4" />
      </button>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-4 pointer-events-none">
        <h3 className="text-white font-bold text-xs md:text-sm line-clamp-2 mb-1">{movie.title}</h3>
        <p className="text-zinc-400 text-[10px] md:text-xs">{movie.category}</p>
        <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2">
          <button className="bg-white text-black rounded-full p-1 md:p-1.5 hover:bg-zinc-200 transition pointer-events-auto">
            <Play size={10} className="md:w-3.5 md:h-3.5" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MovieRow({ title, movies, onMovieClick, onDeleteMovie, onDeleteCategory }) {
  if (movies.length === 0) return null;
  
  return (
    <div className="mb-6 md:mb-8 relative w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-8 mb-2 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        {onDeleteCategory && (
          <button 
            onClick={() => onDeleteCategory(title)}
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition"
            title={`Xóa toàn bộ phim trong kênh ${title}`}
          >
            <Trash2 size={14} /> Xóa kênh
          </button>
        )}
      </div>
      
      <div 
        className="grid grid-rows-2 grid-flow-col auto-cols-[140px] sm:auto-cols-[180px] md:auto-cols-[220px] lg:auto-cols-[280px] gap-2 md:gap-4 pb-4 px-4 md:px-8 overflow-x-auto scroll-smooth w-full snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {movies.map(movie => (
          <MovieCard 
            key={movie.id} 
            movie={movie} 
            onClick={onMovieClick} 
            onDelete={onDeleteMovie} 
            className="w-full h-full snap-start" 
          />
        ))}
      </div>
    </div>
  );
}

function DetailView({ movie: initialMovie, allMovies, onClose, onMovieClick, onDelete, isMiniPlayer, onToggleMiniPlayer }) {
  const [autoNext, setAutoNext] = useState(true);
  const autoNextRef = useRef(true);
  
  // Tách State hiển thị thông tin UI (Title, Desc) ra khỏi Iframe
  const [displayMovie, setDisplayMovie] = useState(initialMovie);
  const [iframeSrc, setIframeSrc] = useState('');
  const iframeRef = useRef(null);
  const similarRowRef = useRef(null);

  useEffect(() => { 
    autoNextRef.current = autoNext; 
  }, [autoNext]);

  // CHÌA KHÓA VƯỢT LỖI CHẠY NỀN: Nạp trực tiếp list video tiếp theo vào Youtube (native playlist)
  useEffect(() => {
    setDisplayMovie(initialMovie);
    
    let nextVideoIds = '';
    if (autoNextRef.current) {
      const similar = allMovies.filter(m => m.category === initialMovie.category && m.id !== initialMovie.id);
      let nextList = similar;
      if (initialMovie.playlistId && initialMovie.playlistIndex !== undefined) {
        nextList = similar.filter(m => (m.playlistIndex || 0) > initialMovie.playlistIndex).sort((a,b) => (a.playlistIndex || 0) - (b.playlistIndex || 0));
        if (nextList.length === 0) nextList = similar; 
      }
      nextVideoIds = nextList.map(m => m.videoId).slice(0, 30).join(',');
    }

    const newSrc = `https://www.youtube.com/embed/${initialMovie.videoId}?autoplay=1&rel=0&cc_load_policy=0&iv_load_policy=3&cc_lang_pref=en&modestbranding=1&playsinline=1&showinfo=0&controls=1&fs=1&disablekb=0&enablejsapi=1&origin=${window.location.origin}${nextVideoIds ? `&playlist=${nextVideoIds}` : ''}`;
    setIframeSrc(newSrc);
    
    // Chỉ tạo lại iframe khi người dùng click dứt khoát vào phim mới từ ngoài trang chủ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMovie.id]); 

  // Lắng nghe YouTube tự động Next -> Đổi Text giao diện mà KHÔNG load lại video
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.origin.includes('youtube.com') && !e.origin.includes('youtube-nocookie.com')) return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'infoDelivery' && data.info?.videoData?.video_id) {
          const currentPlayingId = data.info.videoData.video_id;
          
          if (currentPlayingId !== displayMovie.videoId) {
            const nextMeta = allMovies.find(m => m.videoId === currentPlayingId);
            if (nextMeta) {
              setDisplayMovie(nextMeta); // UI đổi chữ, Iframe vẫn chạy tiếp trơn tru
            }
          }
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [displayMovie.videoId, allMovies]);

  const similarMovies = useMemo(() => {
    if (displayMovie.playlistId) {
      return allMovies
        .filter(m => m.playlistId === displayMovie.playlistId && m.id !== displayMovie.id)
        .sort((a, b) => (a.playlistIndex || 0) - (b.playlistIndex || 0));
    }
    return allMovies
      .filter(m => m.category === displayMovie.category && m.id !== displayMovie.id)
      .slice(0, 15);
  }, [displayMovie, allMovies]);

  const handleScroll = (direction) => {
    if (similarRowRef.current) {
      const { scrollLeft, clientWidth } = similarRowRef.current;
      const offset = clientWidth * 0.75;
      const scrollTo = direction === 'left' ? scrollLeft - offset : scrollLeft + offset;
      similarRowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isMiniPlayer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMiniPlayer]);

  return (
    <div className={isMiniPlayer 
      ? "fixed bottom-4 right-4 md:bottom-6 md:right-6 w-72 sm:w-80 md:w-96 z-[200] bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
      : "fixed inset-0 z-[40] bg-[#141414] overflow-y-auto transition-all duration-300 ease-in-out"}>
      
      {!isMiniPlayer && <div className="w-full h-20 md:h-24 shrink-0"></div>}
      
      {!isMiniPlayer && (
        <div className="relative z-10 w-full px-4 md:px-6 py-2 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 md:gap-2 text-white bg-zinc-800 hover:bg-zinc-700 px-3 md:px-4 py-1.5 md:py-2 rounded-full transition text-xs md:text-sm font-medium border border-zinc-700 shadow-md cursor-pointer pointer-events-auto"
          >
            <ChevronLeft size={18} className="md:w-5 md:h-5" /> Quay lại
          </button>
          
          <button 
            onClick={onToggleMiniPlayer}
            className="flex items-center gap-1.5 text-white bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-1.5 md:py-2 rounded-full transition text-xs md:text-sm font-medium shadow-md cursor-pointer pointer-events-auto"
          >
            <Minimize2 size={16} className="md:w-4 md:h-4" /> Thu nhỏ
          </button>
        </div>
      )}

      {isMiniPlayer && (
        <div 
          className="flex items-center justify-between px-3 py-2 bg-zinc-800/90 backdrop-blur cursor-pointer hover:bg-zinc-700 transition" 
          onClick={onToggleMiniPlayer} 
          title="Phóng to"
        >
          <div className="flex items-center gap-2 overflow-hidden w-full pr-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></div>
            <h3 className="text-xs font-bold text-white truncate">{displayMovie.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggleMiniPlayer(); }} className="text-zinc-300 hover:text-white p-1"><Maximize2 size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-zinc-300 hover:text-red-500 p-1"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className={isMiniPlayer ? "w-full aspect-video bg-black" : "w-full h-[35vh] sm:h-[50vh] lg:h-[80vh] bg-black"}>
        <iframe 
          ref={iframeRef}
          onLoad={(e) => {
            if (e.target && e.target.contentWindow) {
              e.target.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
            }
          }}
          src={iframeSrc}
          title={displayMovie.title}
          className={`w-full h-full border-0 ${isMiniPlayer ? "pointer-events-none" : ""}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={!isMiniPlayer}
        ></iframe>
      </div>

      <div className={isMiniPlayer ? "hidden" : "max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12 flex flex-col gap-8 md:gap-12"}>
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-4">
            <span className="text-green-500 font-bold text-sm md:text-lg">Độ phân giải cao</span>
            <span className="border border-zinc-500 text-zinc-300 text-xs md:text-sm px-1.5 md:px-2 py-0.5 rounded-sm">4K</span>
            {displayMovie.isFull && (
              <span className="bg-red-600 text-white font-bold text-xs md:text-sm px-1.5 md:px-2 py-0.5 rounded-sm uppercase flex items-center gap-1">
                <CheckCircle size={14}/> Đã Full
              </span>
            )}
            <span className="bg-zinc-800 text-white text-xs md:text-sm px-2 md:px-3 py-1 rounded-full">{displayMovie.category}</span>
            
            <label className="flex items-center gap-2 ml-auto text-xs md:text-sm text-zinc-300 cursor-pointer bg-zinc-800/50 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition border border-zinc-700">
              <input 
                type="checkbox" 
                checked={autoNext} 
                onChange={(e) => setAutoNext(e.target.checked)}
                className="w-3.5 h-3.5 accent-red-600 cursor-pointer"
              />
              Tự động phát tập tiếp theo
            </label>
          </div>
          <h1 className="text-2xl md:text-5xl font-bold text-white mb-3 md:mb-6">{displayMovie.title}</h1>
          <p className="text-sm md:text-lg text-zinc-300 leading-relaxed mb-6 md:mb-8">
            {displayMovie.description || "Chưa có thông tin mô tả chi tiết cho video này."}
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <a 
              href={`https://www.youtube.com/watch?v=${displayMovie.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 md:gap-2 text-zinc-400 hover:text-white transition text-sm md:text-base"
            >
              Mở trên YouTube
            </a>
            <button 
              onClick={() => onDelete(displayMovie.id)}
              className="inline-flex items-center gap-1.5 md:gap-2 text-red-500 hover:text-red-400 transition text-sm md:text-base"
            >
              <Trash2 size={16} className="md:w-[18px] md:h-[18px]" /> Xóa phim này
            </button>
          </div>
        </div>
        
        <div className="w-full relative group">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">
            {displayMovie.playlistId ? 'Danh sách phát (Playlist)' : 'Nội dung tương tự'}
          </h3>
          <div className="relative w-full overflow-hidden">
            {similarMovies.length > 0 && (
              <button 
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-0 bottom-4 w-8 md:w-12 bg-black/50 hover:bg-black/80 text-white z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex rounded-r-md"
              >
                <ChevronLeft size={24} className="md:w-8 md:h-8" />
              </button>
            )}
            
            <div 
              ref={similarRowRef}
              className="flex gap-2 md:gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
            >
              {similarMovies.length > 0 ? (
                similarMovies.map(m => (
                  <MovieCard 
                    key={m.id} 
                    movie={m} 
                    onClick={(movie) => { window.scrollTo(0,0); onMovieClick(movie); }} 
                    onDelete={onDelete}
                    className="flex-none w-[140px] sm:w-[160px] md:w-64 snap-start"
                  />
                ))
              ) : (
                <p className="text-zinc-500 text-sm">Không có phim cùng thể loại.</p>
              )}
            </div>

            {similarMovies.length > 0 && (
              <button 
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-0 bottom-4 w-8 md:w-12 bg-black/50 hover:bg-black/80 text-white z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex rounded-l-md"
              >
                <ChevronRight size={24} className="md:w-8 md:h-8" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMovieModal({ categories, onClose, onAddMovies, existingMovies }) {
  const [activeTab, setActiveTab] = useState('single');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories.length > 1 ? categories[1] : 'Hành động');
  const [description, setDescription] = useState('');
  const [isFull, setIsFull] = useState(false);
  
  const [channelId, setChannelId] = useState('');
  const [playlistInput, setPlaylistInput] = useState(''); 
  
  const [apiKey, setApiKey] = useState('');
  const [maxVideos, setMaxVideos] = useState(50);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVideoInfo = async (videoId) => {
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await res.json();
      if (data.title && !title) {
        setTitle(data.title);
        if (detectIsFull(data.title)) {
          setIsFull(true);
        }
      }
    } catch (e) {}
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    const id = extractYoutubeId(val);
    if (id) fetchVideoInfo(id);
  };

  const handleSubmitSingle = (e) => {
    e.preventDefault();
    setError('');
    const videoId = extractYoutubeId(url);
    if (!videoId) return setError("Link YouTube không hợp lệ.");

    if (existingMovies.some(m => m.videoId === videoId || m.title.toLowerCase().trim() === title.toLowerCase().trim())) {
      return setError("Phim này đã tồn tại trong thư viện.");
    }

    onAddMovies([{
      id: Date.now().toString(),
      videoId,
      title: title || "Video không có tiêu đề",
      category,
      description,
      isFull
    }]);
    onClose();
  };

  const handleSubmitChannel = async (e) => {
    e.preventDefault();
    setError('');
    if (!channelId || !apiKey) return setError("Vui lòng nhập Channel ID và API Key.");

    setLoading(true);
    try {
      let allVideos = [];
      let nextPageToken = '';
      let fetchedCount = 0;
      const limit = Math.min(Math.max(parseInt(maxVideos) || 50, 1), 500);

      while (fetchedCount < limit) {
        const fetchCount = Math.min(50, limit - fetchedCount);
        let fetchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${fetchCount}&type=video`;
        if (nextPageToken) fetchUrl += `&pageToken=${nextPageToken}`;

        const res = await fetch(fetchUrl);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        if (!data.items || data.items.length === 0) break;

        const newMovies = data.items
          .filter(item => item.id.videoId)
          .map((item, index) => ({ item, index })) 
          .filter(({item}) => {
             const vidId = item.id.videoId;
             const isDupDb = existingMovies.some(m => m.videoId === vidId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             const isDupLocal = allVideos.some(m => m.videoId === vidId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             return !isDupDb && !isDupLocal;
          })
          .map(({item, index}) => ({
            id: Date.now() + '_' + (fetchedCount + index) + '_' + Math.random().toString(36).substr(2, 9),
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            category: category,
            isFull: detectIsFull(item.snippet.title, item.snippet.description)
          }));

        allVideos = [...allVideos, ...newMovies];
        fetchedCount += data.items.length;
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
      }

      if (allVideos.length === 0) throw new Error("Không tìm thấy video nào mới.");
      onAddMovies(allVideos);
      onClose();
    } catch (err) {
      setError("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPlaylist = async (e) => {
    e.preventDefault();
    setError('');
    const extractedPlaylistId = extractPlaylistId(playlistInput);
    if (!extractedPlaylistId || !apiKey) return setError("Vui lòng nhập Link hoặc ID Playlist và API Key.");

    setLoading(true);
    try {
      let allVideos = [];
      let nextPageToken = '';
      let fetchedCount = 0;
      const limit = Math.min(Math.max(parseInt(maxVideos) || 50, 1), 500);

      while (fetchedCount < limit) {
        const fetchCount = Math.min(50, limit - fetchedCount);
        let fetchUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${extractedPlaylistId}&maxResults=${fetchCount}&key=${apiKey}`;
        if (nextPageToken) fetchUrl += `&pageToken=${nextPageToken}`;

        const res = await fetch(fetchUrl);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        if (!data.items || data.items.length === 0) break;

        const newMovies = data.items
          .filter(item => item.snippet.resourceId && item.snippet.resourceId.videoId)
          .map((item, index) => ({ item, index })) 
          .filter(({item}) => {
             const vidId = item.snippet.resourceId.videoId;
             const isDupDb = existingMovies.some(m => m.videoId === vidId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             const isDupLocal = allVideos.some(m => m.videoId === vidId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             return !isDupDb && !isDupLocal;
          })
          .map(({item, index}) => ({
            id: Date.now() + '_' + (fetchedCount + index) + '_' + Math.random().toString(36).substr(2, 9),
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            category: category,
            isFull: detectIsFull(item.snippet.title, item.snippet.description),
            playlistId: extractedPlaylistId,
            playlistIndex: fetchedCount + index
          }));

        allVideos = [...allVideos, ...newMovies];
        fetchedCount += data.items.length;
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
      }

      if (allVideos.length === 0) throw new Error("Không tìm thấy video mới nào trong playlist.");
      onAddMovies(allVideos);
      onClose();
    } catch (err) {
      setError("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-zinc-800 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-white">Thêm Nội Dung</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X size={20} className="md:w-6 md:h-6" /></button>
        </div>
        
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            className={`flex-1 py-2 md:py-3 text-[11px] md:text-sm font-semibold transition ${activeTab === 'single' ? 'text-white border-b-2 border-red-600 bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
            onClick={() => { setActiveTab('single'); setError(''); }}
          >
            Một Video
          </button>
          <button
            className={`flex-1 py-2 md:py-3 text-[11px] md:text-sm font-semibold transition ${activeTab === 'channel' ? 'text-white border-b-2 border-red-600 bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
            onClick={() => { setActiveTab('channel'); setError(''); }}
          >
            Cả Kênh
          </button>
          <button
            className={`flex-1 py-2 md:py-3 text-[11px] md:text-sm font-semibold transition ${activeTab === 'playlist' ? 'text-white border-b-2 border-red-600 bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
            onClick={() => { setActiveTab('playlist'); setError(''); }}
          >
            Playlist
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {error && <div className="mb-4 p-2 md:p-3 bg-red-500/20 border border-red-500 text-red-500 rounded text-xs md:text-sm">{error}</div>}
          
          {activeTab === 'single' && (
            <form onSubmit={handleSubmitSingle} className="flex flex-col gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Link YouTube</label>
                <input 
                  type="text" value={url} onChange={handleUrlChange} required
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Tiêu đề (Tự động tải)</label>
                <input 
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Thể loại</label>
                <input 
                  type="text" 
                  list="category-options"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nhập hoặc chọn thể loại..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                  required
                />
                <datalist id="category-options">
                  {categories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Mô tả (Tùy chọn)</label>
                <textarea 
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition h-16 md:h-20 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs md:text-sm text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isFull} 
                  onChange={(e) => setIsFull(e.target.checked)}
                  className="w-3.5 h-3.5 md:w-4 md:h-4 accent-red-600"
                />
                Đánh dấu phim này là Trọn bộ (Đã Full)
              </label>
              <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1.5 md:py-2 rounded font-bold text-sm transition">
                Thêm Video
              </button>
            </form>
          )}

          {activeTab === 'channel' && (
             <form onSubmit={handleSubmitChannel} className="flex flex-col gap-3 md:gap-4">
              <div className="text-[10px] md:text-xs text-blue-400 bg-blue-400/10 p-2 md:p-3 rounded border border-blue-400/20">
                Tính năng này tự động phân tích tiêu đề để gắn nhãn "Đã Full" khi tải video về.
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Channel ID</label>
                <input 
                  type="text" value={channelId} onChange={(e) => setChannelId(e.target.value)} required
                  placeholder="VD: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">YouTube API Key</label>
                <input 
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required
                  placeholder="AIzaSy..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Số lượng video (Tối đa 500)</label>
                <input 
                  type="number" value={maxVideos} onChange={(e) => setMaxVideos(e.target.value)} required
                  min="1" max="500"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Xếp vào Thể loại</label>
                <input 
                  type="text" 
                  list="category-options-channel"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nhập hoặc chọn thể loại..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                  required
                />
                <datalist id="category-options-channel">
                  {categories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <button type="submit" disabled={loading} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1.5 md:py-2 rounded font-bold text-sm transition disabled:opacity-50">
                {loading ? 'Đang tải...' : 'Nhập Kênh'}
              </button>
            </form>
          )}

          {activeTab === 'playlist' && (
             <form onSubmit={handleSubmitPlaylist} className="flex flex-col gap-3 md:gap-4">
              <div className="text-[10px] md:text-xs text-blue-400 bg-blue-400/10 p-2 md:p-3 rounded border border-blue-400/20">
                Bạn có thể dán toàn bộ đường link của Playlist hoặc chỉ copy phần ID (phần sau chữ list=).
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Link hoặc ID Playlist</label>
                <input 
                  type="text" value={playlistInput} onChange={(e) => setPlaylistInput(e.target.value)} required
                  placeholder="VD: https://www.youtube.com/playlist?list=PL..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">YouTube API Key</label>
                <input 
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required
                  placeholder="AIzaSy..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Số lượng video (Tối đa 500)</label>
                <input 
                  type="number" value={maxVideos} onChange={(e) => setMaxVideos(e.target.value)} required
                  min="1" max="500"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-400 mb-1">Xếp vào Thể loại</label>
                <input 
                  type="text" 
                  list="category-options-playlist"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nhập hoặc chọn thể loại..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2 md:px-3 py-1.5 md:py-2 text-sm focus:border-red-600 outline-none transition"
                  required
                />
                <datalist id="category-options-playlist">
                  {categories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <button type="submit" disabled={loading} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1.5 md:py-2 rounded font-bold text-sm transition disabled:opacity-50">
                {loading ? 'Đang tải Playlist...' : 'Nhập Playlist'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [movies, setMovies] = useState(() => {
    if (!useCloud) {
      const saved = localStorage.getItem('youflix_movies_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return initialMovies;
    }
    return [];
  });

  const [currentCategory, setCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showOnlyFull, setShowOnlyFull] = useState(false);
  const [user, setUser] = useState(null);

  const dynamicCategories = useMemo(() => {
    const uniqueCats = new Set(movies.map(m => m.category));
    return ['Tất cả', ...Array.from(uniqueCats)];
  }, [movies]);

  useEffect(() => {
    if (!useCloud || !auth) return;
    signInAnonymously(auth).catch(error => console.error("Lỗi xác thực:", error));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!useCloud || !db) return;

    const moviesRef = collection(db, 'artifacts', appId, 'public', 'data', 'movies');
    const unsubscribe = onSnapshot(moviesRef, (snapshot) => {
      if (snapshot.empty && movies.length === 0) {
        initialMovies.forEach(async (movie) => {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movies', movie.id), movie);
        });
      } else {
        const loadedMovies = [];
        snapshot.forEach((doc) => {
          loadedMovies.push(doc.data());
        });
        loadedMovies.sort((a, b) => b.id.localeCompare(a.id));
        setMovies(loadedMovies);
      }
    }, (error) => {
      console.error("Lỗi tải dữ liệu phim:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!useCloud) {
      localStorage.setItem('youflix_movies_v2', JSON.stringify(movies));
    }
  }, [movies]);
  
  const handleAddMovies = async (newMovies) => {
    if (db) {
      newMovies.forEach(async (movie) => {
        try {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movie.id);
          await setDoc(movieDocRef, movie);
        } catch (e) {
          console.error("Lỗi khi thêm phim:", e);
        }
      });
    } else {
      setMovies(prev => [...newMovies, ...prev]);
    }
  };

  const handleDeleteRequest = (id) => {
    setMovieToDelete(id);
  };
  
  const confirmDelete = async () => {
    if (movieToDelete) {
      if (db) {
        try {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movieToDelete);
          await deleteDoc(movieDocRef);
        } catch (e) {}
      } else {
        setMovies(prev => prev.filter(m => m.id !== movieToDelete));
      }

      if (selectedMovie && selectedMovie.id === movieToDelete) {
        setSelectedMovie(null);
        setIsMiniPlayer(false);
      }
      setMovieToDelete(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      const moviesInCat = movies.filter(m => m.category === categoryToDelete);
      if (db) {
        moviesInCat.forEach(async (m) => {
          try {
            const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', m.id);
            await deleteDoc(movieDocRef);
          } catch (e) {}
        });
      } else {
        setMovies(prev => prev.filter(m => m.category !== categoryToDelete));
      }

      if (currentCategory === categoryToDelete) {
        setCategory('Tất cả');
      }
      setCategoryToDelete(null);
    }
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    setIsMiniPlayer(false);
    window.scrollTo(0,0);
  };

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchCat = currentCategory === 'Tất cả' || m.category === currentCategory;
      const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchFullStatus = showOnlyFull ? detectIsFull(m.title, m.description) : true;
      return matchCat && matchSearch && matchFullStatus;
    });
  }, [movies, currentCategory, searchQuery, showOnlyFull]);

  const heroMovie = filteredMovies.length > 0 ? filteredMovies[0] : null;

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-x-hidden font-sans">
      <Navbar 
        categories={dynamicCategories}
        currentCategory={currentCategory} 
        setCategory={setCategory} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAdd={() => setIsAddModalOpen(true)}
        showOnlyFull={showOnlyFull}
        setShowOnlyFull={setShowOnlyFull}
        onNavigate={() => { setSelectedMovie(null); setIsMiniPlayer(false); }} 
      />

      <main className="pb-20">
        {!searchQuery && currentCategory === 'Tất cả' && <Hero movie={heroMovie} onPlay={handleSelectMovie} />}
        
        <div className={`relative w-full z-10 ${!searchQuery && currentCategory === 'Tất cả' ? '-mt-16 md:-mt-32' : 'pt-24 md:pt-28'}`}>
          {currentCategory === 'Tất cả' && !searchQuery ? (
            dynamicCategories.filter(c => c !== 'Tất cả').map(cat => {
              const catMovies = filteredMovies.filter(m => m.category === cat);
              if (catMovies.length === 0) return null;
              return <MovieRow 
                key={cat} 
                title={cat} 
                movies={catMovies} 
                onMovieClick={handleSelectMovie} 
                onDeleteMovie={handleDeleteRequest} 
                onDeleteCategory={setCategoryToDelete}
              />
            })
          ) : (
            <div className="px-4 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold flex flex-wrap items-center gap-2 md:gap-3">
                  {searchQuery ? `Kết quả tìm kiếm cho: "${searchQuery}"` : currentCategory}
                  {showOnlyFull && <span className="bg-red-600 text-white text-[10px] md:text-xs px-2 py-1 rounded uppercase tracking-wider">Đã Full</span>}
                </h2>
                
                {!searchQuery && currentCategory !== 'Tất cả' && (
                  <button
                    onClick={() => setCategoryToDelete(currentCategory)}
                    className="text-xs md:text-sm text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 flex items-center gap-1.5 transition px-3 py-1.5 rounded border border-red-500/30"
                  >
                    <Trash2 size={16} /> Xóa kênh này
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 md:gap-4">
                {filteredMovies.map(movie => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    onClick={handleSelectMovie} 
                    onDelete={handleDeleteRequest}
                    className="flex-none w-[140px] sm:w-[160px] md:w-[220px] lg:w-[256px]"
                  />
                ))}
                {filteredMovies.length === 0 && (
                  <p className="text-zinc-500 w-full py-10 md:py-20 text-center text-sm md:text-base">Không tìm thấy nội dung phù hợp với bộ lọc hiện tại.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 md:py-8 flex flex-col items-center text-center text-zinc-600 text-xs md:text-sm gap-2">
        <p>YouFlix - Clone Project. Dữ liệu lưu trữ thông minh.</p>
        <button 
          onClick={() => {
            if (useCloud && user) {
              movies.forEach(async (m) => {
                const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', m.id);
                await deleteDoc(movieDocRef);
              });
            } else {
              localStorage.removeItem('youflix_movies_v2');
              setMovies(initialMovies);
            }
            window.scrollTo(0,0);
          }}
          className="text-[10px] md:text-xs text-zinc-500 hover:text-white underline transition"
        >
          Khôi phục dữ liệu gốc
        </button>
      </footer>

      {selectedMovie && (
        <DetailView 
          movie={selectedMovie} 
          allMovies={movies}
          onClose={() => { setSelectedMovie(null); setIsMiniPlayer(false); }} 
          onMovieClick={handleSelectMovie}
          onDelete={handleDeleteRequest}
          isMiniPlayer={isMiniPlayer}
          onToggleMiniPlayer={() => setIsMiniPlayer(!isMiniPlayer)}
        />
      )}
      
      {isAddModalOpen && (
        <AddMovieModal 
          categories={dynamicCategories}
          existingMovies={movies}
          onClose={() => setIsAddModalOpen(false)} 
          onAddMovies={handleAddMovies}
        />
      )}

      <ConfirmDialog 
        isOpen={!!movieToDelete}
        title="Xác nhận xóa phim"
        message="Bạn có chắc chắn muốn xóa bộ phim này khỏi thư viện? Hành động này không thể hoàn tác."
        onConfirm={confirmDelete}
        onCancel={() => setMovieToDelete(null)}
      />
      
      <ConfirmDialog 
        isOpen={!!categoryToDelete}
        title="Xác nhận xóa kênh"
        message={`Bạn có chắc chắn muốn xóa kênh "${categoryToDelete}" cùng TẤT CẢ video bên trong? Hành động này KHÔNG THỂ hoàn tác.`}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}