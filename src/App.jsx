import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// --- Cấu hình Firebase của riêng bạn ---
const firebaseConfig = {
  apiKey: "AIzaSyCFHM0yidEmIRU0DgSsYr721J1QfRFQR0M",
  authDomain: "youflix-shared.firebaseapp.com",
  projectId: "youflix-shared",
  storageBucket: "youflix-shared.firebasestorage.app",
  messagingSenderId: "309437656302",
  appId: "1:309437656302:web:4365301530338d0a1c97ff",
  measurementId: "G-QGZGL1MPZR"
};

// Khởi tạo Firebase trực tiếp để dùng chung cho mọi người
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

// --- Utility Functions ---
const extractYoutubeId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
};

const getThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
const getHighResThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

// Thuật toán nhận diện phim trọn bộ qua từ khóa
const detectIsFull = (title, description = '') => {
  const keywords = ['full', 'trọn bộ', 'tập cuối', 'end', 'hoàn tất'];
  const textToScan = (title + ' ' + description).toLowerCase();
  return keywords.some(kw => textToScan.includes(kw));
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
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition font-medium">Hủy</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold transition">Xóa phim</button>
        </div>
      </div>
    </div>
  );
}

function Navbar({ categories, currentCategory, setCategory, searchQuery, setSearchQuery, onOpenAdd, showOnlyFull, setShowOnlyFull }) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#141414]/95 backdrop-blur-md py-3 px-4 md:px-12 flex items-center justify-between gap-4 border-b border-zinc-800/80 shadow-lg">
      <div className="flex items-center gap-6 overflow-hidden">
        <h1 className="text-red-600 font-black text-2xl md:text-3xl tracking-tighter cursor-pointer shrink-0" onClick={() => setCategory('Tất cả')}>
          YOUFLIX
        </h1>
        <div className="hidden lg:flex gap-4 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-sm font-medium transition shrink-0 ${currentCategory === cat ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-auto">
        <label className="hidden sm:flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300 hover:text-white transition bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-700">
          <input 
            type="checkbox" 
            checked={showOnlyFull} 
            onChange={(e) => setShowOnlyFull(e.target.checked)}
            className="w-4 h-4 accent-red-600"
          />
          Chỉ Full
        </label>
        
        <div className="relative w-36 sm:w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-full py-1.5 pl-9 pr-3 focus:outline-none focus:border-white transition placeholder:text-zinc-500 text-xs md:text-sm"
          />
        </div>
        
        <button 
          onClick={onOpenAdd}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-full font-medium text-xs md:text-sm transition shrink-0 shadow"
        >
          <Plus size={16} />
          <span>Thêm Phim</span>
        </button>
      </div>
    </nav>
  );
}

function Hero({ movie, onPlay }) {
  if (!movie) return null;
  
  return (
    <div className="relative w-full h-[65vh] md:h-[75vh] min-h-[450px] mb-8 overflow-hidden pt-16">
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={getHighResThumbnail(movie.videoId)} 
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30"></div>
      </div>
      
      <div className="absolute bottom-10 left-4 md:left-12 right-4 max-w-2xl z-20">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-green-500 font-bold text-sm">98% Phù hợp</span>
          <span className="border border-zinc-500 text-zinc-300 text-xs px-2 py-0.5 rounded-sm">4K</span>
          {movie.isFull && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-sm uppercase">Đã Full</span>}
          <span className="text-zinc-300 text-sm">{movie.category}</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-md">
          {movie.title}
        </h2>
        <p className="text-sm md:text-base text-zinc-300 mb-6 line-clamp-2 max-w-xl">
          {movie.description || "Một tuyệt tác đáng xem trên nền tảng của chúng tôi."}
        </p>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded hover:bg-white/80 transition font-bold text-sm md:text-base shadow-lg"
          >
            <Play size={20} fill="currentColor" /> Phát ngay
          </button>
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-2 bg-zinc-500/60 text-white px-6 py-2.5 rounded hover:bg-zinc-500/80 transition font-bold text-sm md:text-base backdrop-blur-sm shadow-lg"
          >
            <Info size={20} /> Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ movie, onClick, onDelete }) {
  return (
    <div 
      className="group/card relative flex-none w-64 aspect-video rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 bg-zinc-800"
      onClick={() => onClick(movie)}
    >
      <img 
        src={getThumbnail(movie.videoId)} 
        alt={movie.title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {movie.isFull && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow z-10">
          FULL
        </div>
      )}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
        className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-all z-20"
        title="Xóa phim"
      >
        <Trash2 size={16} />
      </button>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
        <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">{movie.title}</h3>
        <p className="text-zinc-400 text-xs">{movie.category}</p>
        <div className="flex items-center gap-2 mt-2">
          <button className="bg-white text-black rounded-full p-1.5 hover:bg-zinc-200 transition">
            <Play size={14} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MovieRow({ title, movies, onMovieClick, onDeleteMovie }) {
  if (movies.length === 0) return null;
  
  return (
    <div className="mb-8 w-full">
      <h2 className="text-xl font-bold text-white mb-4 px-4 md:px-8">{title}</h2>
      {/* Trên điện thoại hiển thị cuộn ngang mượt mà, trên máy tính hiển thị tối ưu */}
      <div 
        className="flex gap-4 pb-4 px-4 md:px-8 overflow-x-auto scroll-smooth w-full no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map(movie => (
          <div key={movie.id} className="shrink-0 w-[220px] sm:w-64">
            <MovieCard movie={movie} onClick={onMovieClick} onDelete={onDeleteMovie} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailView({ movie, allMovies, onClose, onMovieClick, onDelete }) {
  const similarMovies = useMemo(() => {
    return allMovies
      .filter(m => m.category === movie.category && m.id !== movie.id)
      .slice(0, 10);
  }, [movie, allMovies]);

  const similarRowRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (similarRowRef.current) {
      const { scrollLeft, clientWidth } = similarRowRef.current;
      const offset = clientWidth * 0.75;
      const scrollTo = direction === 'left' ? scrollLeft - offset : scrollLeft + offset;
      similarRowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#141414] overflow-y-auto">
      <button 
        onClick={onClose}
        className="fixed top-6 left-6 z-[110] flex items-center gap-2 text-white bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full backdrop-blur transition"
      >
        <ChevronLeft size={20} /> Quay lại
      </button>
      
      <div className="w-full h-[60vh] lg:h-[80vh] bg-black">
        <iframe 
          src={`https://www.youtube.com/embed/${movie.videoId}?autoplay=1&rel=0`}
          title={movie.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 flex flex-col gap-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-green-500 font-bold text-lg">Độ phân giải cao</span>
            <span className="border border-zinc-500 text-zinc-300 text-sm px-2 py-0.5 rounded-sm">4K</span>
            {movie.isFull && (
              <span className="bg-red-600 text-white font-bold text-sm px-2 py-0.5 rounded-sm uppercase flex items-center gap-1">
                <CheckCircle size={14}/> Đã Full
              </span>
            )}
            <span className="bg-zinc-800 text-white text-sm px-3 py-1 rounded-full">{movie.category}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{movie.title}</h1>
          <p className="text-lg text-zinc-300 leading-relaxed mb-8">
            {movie.description || "Chưa có thông tin mô tả chi tiết cho video này."}
          </p>
          <a 
            href={`https://www.youtube.com/watch?v=${movie.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition"
          >
            Mở trên YouTube
          </a>
          <button 
            onClick={() => onDelete(movie.id)}
            className="ml-6 inline-flex items-center gap-2 text-red-500 hover:text-red-400 transition"
          >
            <Trash2 size={18} /> Xóa phim này
          </button>
        </div>
        
        <div className="w-full relative group">
          <h3 className="text-xl font-bold text-white mb-6">Nội dung tương tự</h3>
          <div className="relative">
            {similarMovies.length > 0 && (
              <button 
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-0 bottom-4 w-12 bg-black/50 hover:bg-black/80 text-white z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex -ml-4 rounded-r-md"
              >
                <ChevronLeft size={32} />
              </button>
            )}
            
            <div 
              ref={similarRowRef}
              className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
            >
              {similarMovies.length > 0 ? (
                similarMovies.map(m => (
                  <MovieCard 
                    key={m.id} 
                    movie={m} 
                    onClick={(movie) => { window.scrollTo(0,0); onMovieClick(movie); }} 
                    onDelete={onDelete} 
                  />
                ))
              ) : (
                <p className="text-zinc-500 text-sm">Không có phim cùng thể loại.</p>
              )}
            </div>

            {similarMovies.length > 0 && (
              <button 
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-0 bottom-4 w-12 bg-black/50 hover:bg-black/80 text-white z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex -mr-4 rounded-l-md"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMovieModal({ categories, onClose, onAddMovies, existingMovies, db, appId, useCloud }) {
  // Trạng thái chuyển đổi giữa 'single' (thêm 1 phim) và 'channel' (nhập nguyên kênh)
  const [activeTab, setActiveTab] = useState('single');

  // State cho Thêm 1 phim lẻ
  const [newTitle, setNewTitle] = useState('');
  const [newVideoId, setNewVideoId] = useState('');
  const [newCategory, setNewCategory] = useState(categories.length > 1 ? categories[1] : 'Hành động');
  const [newDesc, setNewDesc] = useState('');
  const [newIsFull, setNewIsFull] = useState(false);

  // State cho Nhập nguyên kênh
  const [channelId, setChannelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [maxVideos, setMaxVideos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Xử lý thêm 1 phim lẻ
  const handleAddSingleMovie = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoId.trim()) {
      alert("Vui lòng nhập tên phim và mã video!");
      return;
    }

    const newMovie = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      videoId: newVideoId.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Mô tả bộ phim.',
      isFull: newIsFull
    };

    try {
      if (useCloud && db) {
        const { doc, setDoc } = await import('firebase/firestore');
        const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', newMovie.id);
        await setDoc(movieDocRef, newMovie);
      }
      onAddMovies(newMovie);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu phim lên mây:", err);
      alert("Có lỗi xảy ra khi lưu phim!");
    }
  };

  // Xử lý nhập nguyên kênh YouTube qua API
  const handleImportChannel = async (e) => {
    e.preventDefault();
    if (!channelId.trim() || !apiKey.trim()) {
      setError('Vui lòng nhập Channel ID và YouTube API Key!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId.trim()}&part=snippet,id&order=date&maxResults=${maxVideos}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const items = data.items || [];
      const importedMovies = items
        .filter(item => item.id.kind === 'youtube#video')
        .map((item, index) => ({
          id: `ch_${item.id.videoId}_${Date.now()}_${index}`,
          title: item.snippet.title,
          videoId: item.id.videoId,
          category: categories.length > 1 ? categories[1] : 'Hành động',
          description: item.snippet.description || 'Video nhập từ kênh YouTube.',
          isFull: false
        }));

      if (importedMovies.length === 0) {
        setError('Không tìm thấy video nào trong kênh này!');
        setLoading(false);
        return;
      }

      // Lưu từng video lên Firebase Firestore
      if (useCloud && db) {
        const { doc, setDoc } = await import('firebase/firestore');
        for (const movie of importedMovies) {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movie.id);
          await setDoc(movieDocRef, movie);
        }
      }

      // Cập nhật giao diện
      importedMovies.forEach(m => onAddMovies(m));
      setLoading(false);
      onClose();
    } catch (err) {
      console.error("Lỗi nhập kênh:", err);
      setError(`Lỗi: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
        
        {/* Tab chuyển đổi giữa Thêm lẻ và Nhập kênh */}
        <div className="flex border-b border-zinc-800 pb-2 mb-2">
          <button 
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 pb-2 text-sm font-semibold transition ${activeTab === 'single' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-400 hover:text-white'}`}
          >
            Thêm 1 Phim
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('channel')}
            className={`flex-1 pb-2 text-sm font-semibold transition ${activeTab === 'channel' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-400 hover:text-white'}`}
          >
            Nhập Nguyên Kênh
          </button>
        </div>

        {/* NỘI DUNG TAB 1: THÊM 1 PHIM LẺ */}
        {activeTab === 'single' && (
          <form onSubmit={handleAddSingleMovie} className="space-y-4">
            <h3 className="text-lg font-bold text-white">Thêm phim mới</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tên phim</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nhập tên phim..."
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Mã Video YouTube (videoId)</label>
              <input 
                type="text" 
                value={newVideoId} 
                onChange={(e) => setNewVideoId(e.target.value)}
                placeholder="Ví dụ: dQw4w9WgXcQ"
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Thể loại</label>
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              >
                {categories.filter(c => c !== 'Tất cả').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Mô tả ngắn</label>
              <textarea 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Nhập mô tả..."
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600 resize-none h-16"
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isFullCheckbox"
                checked={newIsFull} 
                onChange={(e) => setNewIsFull(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="isFullCheckbox" className="text-sm text-zinc-300 cursor-pointer">Đã Full bộ / Trọn bộ</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
              >
                Thêm phim
              </button>
            </div>
          </form>
        )}

        {/* NỘI DUNG TAB 2: NHẬP NGUYÊN KÊNH YOUTUBE */}
        {activeTab === 'channel' && (
          <form onSubmit={handleImportChannel} className="space-y-4">
            <h3 className="text-lg font-bold text-white">Nhập nguyên kênh YouTube</h3>
            {error && <div className="text-red-500 text-xs bg-red-950/50 p-2 rounded border border-red-900">{error}</div>}
            
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">YouTube API Key</label>
              <input 
                type="text" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập khóa API YouTube của bạn..."
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Channel ID (ID Kênh)</label>
              <input 
                type="text" 
                value={channelId} 
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Ví dụ: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Số lượng video tối đa muốn lấy</label>
              <input 
                type="number" 
                value={maxVideos} 
                onChange={(e) => setMaxVideos(Number(e.target.value))}
                min="1" 
                max="50"
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-50"
              >
                {loading ? 'Đang nhập...' : 'Nhập nguyên kênh'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [movies, setMovies] = useState(() => {
    const saved = localStorage.getItem('youflix_movies_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialMovies;
  });

  const [currentCategory, setCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showOnlyFull, setShowOnlyFull] = useState(false);

  // Khai báo state trực tiếp trong App để không bao giờ bị lỗi undefined
  const [newTitle, setNewTitle] = useState('');
  const [newVideoId, setNewVideoId] = useState('');
  const [newCategory, setNewCategory] = useState('Hành động');
  const [newDesc, setNewDesc] = useState('');
  const [newIsFull, setNewIsFull] = useState(false);

  // Hàm xử lý thêm phim nằm trực tiếp trong App
  const handleAddMovieSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoId.trim()) {
      alert("Vui lòng nhập tên phim và mã video!");
      return;
    }

    const newMovie = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      videoId: newVideoId.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Mô tả bộ phim.',
      isFull: newIsFull
    };

    try {
      if (useCloud && db) {
        const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', newMovie.id);
        await setDoc(movieDocRef, newMovie);
      }
      setMovies(prev => [newMovie, ...prev]);
      setIsAddModalOpen(false);
      
      // Reset form
      setNewTitle('');
      setNewVideoId('');
      setNewDesc('');
      setNewIsFull(false);
    } catch (error) {
      console.error("Lỗi khi lưu phim:", error);
      alert("Có lỗi xảy ra khi lưu phim!");
    }
  };
useEffect(() => {
    if (!useCloud || !db) return;

    // Đường dẫn collection trên Firestore
    const moviesRef = collection(db, 'artifacts', appId, 'public', 'data', 'movies');
    
    const unsubscribe = onSnapshot(moviesRef, (snapshot) => {
      if (!snapshot.empty) {
        const loadedMovies = [];
        snapshot.forEach((doc) => {
          loadedMovies.push(doc.data());
        });
        // Sắp xếp phim mới thêm lên đầu
        loadedMovies.sort((a, b) => b.id.localeCompare(a.id));
        setMovies(loadedMovies);
      } else {
        // Nếu database hoàn toàn trống, tự động đẩy danh sách phim hiện tại lên mây để mọi người cùng thấy
        initialMovies.forEach(async (movie) => {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movie.id);
          await setDoc(movieDocRef, movie);
        });
      }
    }, (error) => {
      console.error("Lỗi tải dữ liệu phim từ Cloud:", error);
    });

    return () => unsubscribe();
  }, []);


  // Đồng bộ dữ liệu vào LocalStorage khi chạy độc lập
  useEffect(() => {
    if (!useCloud) {
      localStorage.setItem('youflix_movies_v2', JSON.stringify(movies));
    }
  }, [movies]);

// Khởi tạo Firebase an toàn nếu bật chế độ cloud
useEffect(() => {
  if (!useCloud || !auth) return;

  const initAuth = async () => {
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error("Lỗi xác thực:", error);
    }
  };
  initAuth();

  const unsubscribe = onAuthStateChanged(auth, setUser);
  return () => unsubscribe();
}, []);

  // Lấy dữ liệu từ Firestore khi đã kết nối cloud thành công
  useEffect(() => {
    if (!useCloud || !user || !db) return;

    const moviesRef = collection(db, 'artifacts', appId, 'public', 'data', 'movies');
    
    const unsubscribe = onSnapshot(moviesRef, (snapshot) => {
      if (snapshot.empty) {
        initialMovies.forEach(async (movie) => {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movie.id);
          await setDoc(movieDocRef, movie);
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

const handleAddMovie = async (e) => {
  e.preventDefault();
  
  if (!newTitle.trim() || !newVideoId.trim()) {
    alert("Vui lòng nhập tên phim và mã video YouTube!");
    return;
  }

  const newMovie = {
    id: Date.now().toString(),
    title: newTitle.trim(),
    videoId: newVideoId.trim(),
    category: newCategory,
    description: newDesc.trim() || 'Mô tả bộ phim.',
    isFull: newIsFull
  };

  try {
    if (db) {
      const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', newMovie.id);
      await setDoc(movieDocRef, newMovie);
    }
    
    setMovies(prev => [newMovie, ...prev]);
    setIsAddModalOpen(false);
    
    // Reset form
    setNewTitle('');
    setNewVideoId('');
    setNewDesc('');
    setNewIsFull(false);
  } catch (error) {
    console.error("Lỗi khi thêm phim:", error);
    alert("Có lỗi xảy ra khi lưu phim lên mây!");
  }
};

  const handleDeleteRequest = (id) => {
    setMovieToDelete(id);
  };

  const confirmDelete = async () => {
    if (movieToDelete) {
      if (useCloud && user) {
        try {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movieToDelete);
          await deleteDoc(movieDocRef);
        } catch (e) {
          console.error("Lỗi khi xóa phim:", e);
        }
      } else {
        setMovies(prev => prev.filter(m => m.id !== movieToDelete));
      }

      if (selectedMovie && selectedMovie.id === movieToDelete) {
        setSelectedMovie(null);
      }
      setMovieToDelete(null);
    }
  };

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchCat = currentCategory === 'Tất cả' || m.category === currentCategory;
      const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchFullStatus = showOnlyFull ? m.isFull === true : true;
      return matchCat && matchSearch && matchFullStatus;
    });
  }, [movies, currentCategory, searchQuery, showOnlyFull]);

const heroMovie = filteredMovies.length > 0 ? filteredMovies[0] : null;

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-x-hidden font-sans w-full max-w-full m-0 p-0">
      <Navbar 
        categories={dynamicCategories}
        currentCategory={currentCategory}
        setCategory={setCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAdd={() => setIsAddModalOpen(true)}
        showOnlyFull={showOnlyFull}
        setShowOnlyFull={setShowOnlyFull}
      />

<main className="w-full min-h-screen bg-[#141414] pb-20 overflow-x-hidden pt-44 md:pt-28">
    {!searchQuery && currentCategory === 'Tất cả' && <Hero movie={heroMovie} onPlay={setSelectedMovie} />}
    
<div className={`w-full relative z-10 ${!searchQuery && currentCategory === 'Tất cả' ? 'mt-4 md:-mt-32' : 'pt-4'}`}>
      {currentCategory === 'Tất cả' && !searchQuery ? (
        dynamicCategories.filter(c => c !== 'Tất cả').map(cat => {
          const catMovies = filteredMovies.filter(m => m.category === cat);
          if (catMovies.length === 0) return null;
          return <MovieRow key={cat} title={cat} movies={catMovies} onMovieClick={setSelectedMovie} onDeleteMovie={handleDeleteRequest} />
        })
      ) : (
        <div className="w-full px-8 md:px-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
            {searchQuery ? `Kết quả tìm kiếm cho: "${searchQuery}"` : currentCategory}
            {showOnlyFull && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded uppercase tracking-wider">Đã Full</span>}
          </h2>
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} onClick={setSelectedMovie} onDelete={handleDeleteRequest} />
            ))}
            {filteredMovies.length === 0 && (
              <p className="text-zinc-500 w-full col-span-full py-20 text-center">Không tìm thấy nội dung phù hợp với bộ lọc hiện tại.</p>
            )}
          </div>
        </div>
      )}
    </div>
     </main>

      <footer className="w-full py-8 flex flex-col items-center text-center text-zinc-600 text-sm gap-2 bg-[#141414]">
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
          className="text-xs text-zinc-500 hover:text-white underline transition"
        >
          Khôi phục dữ liệu gốc
        </button>
      </footer>

      {selectedMovie && (
        <DetailView 
          movie={selectedMovie} 
          allMovies={movies}
          onClose={() => setSelectedMovie(null)} 
          onMovieClick={setSelectedMovie}
          onDelete={handleDeleteRequest}
        />
      )}
      
{isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddMovieSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white mb-2">Thêm phim mới</h3>
            
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tên phim</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nhập tên phim..."
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Mã Video YouTube (videoId)</label>
              <input 
                type="text" 
                value={newVideoId} 
                onChange={(e) => setNewVideoId(e.target.value)}
                placeholder="Ví dụ: dQw4w9WgXcQ"
                required
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Thể loại</label>
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              >
                {categories.filter(c => c !== 'Tất cả').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Mô tả ngắn</label>
              <textarea 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Nhập mô tả..."
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600 resize-none h-20"
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isFullCheckbox"
                checked={newIsFull} 
                onChange={(e) => setNewIsFull(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="isFullCheckbox" className="text-sm text-zinc-300 cursor-pointer">Đã Full bộ / Trọn bộ</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
              >
                Thêm phim
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!movieToDelete}
        title="Xác nhận xóa phim"
        message="Bạn có chắc chắn muốn xóa bộ phim này khỏi thư viện? Hành động này không thể hoàn tác."
        onConfirm={confirmDelete}
        onCancel={() => setMovieToDelete(null)}
      />
    </div>
  );
}