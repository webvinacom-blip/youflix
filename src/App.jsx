import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// --- Cấu hình Firebase của riêng bạn ---
const firebaseConfig = {
  apiKey: "AIzaSyCFHM0yidEmIRU0DgSsYr721J1QfRFQJ0M",
  authDomain: "youflix-shared.firebaseapp.com",
  projectId: "youflix-shared",
  storageBucket: "youflix-shared.appspot.com",
  messagingSenderId: "309437656302",
  appId: "1:309437656302:web:4365301530338d0a1c97ff",
  measurementId: "G-QGZG1IMPZR"
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
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/90 to-transparent pb-4 pt-4 px-8 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
      <div className="flex items-center gap-8 w-full md:w-auto overflow-hidden">
        <h1 className="text-red-600 font-black text-3xl tracking-tighter cursor-pointer shrink-0" onClick={() => setCategory('Tất cả')}>
          YOUFLIX
        </h1>
        <div className="flex gap-4 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-sm font-medium transition shrink-0 ${currentCategory === cat ? 'text-white' : 'text-zinc-300 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-300 hover:text-white transition bg-black/40 px-3 py-1.5 rounded-full border border-zinc-700">
          <input 
            type="checkbox" 
            checked={showOnlyFull} 
            onChange={(e) => setShowOnlyFull(e.target.checked)}
            className="w-4 h-4 accent-red-600"
          />
          Chỉ hiện phim đã Full
        </label>
        
        <div className="relative flex-1 md:w-64 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm phim..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-zinc-700 text-white rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:border-white transition placeholder:text-zinc-500 text-sm"
          />
        </div>
        
        <button 
          onClick={onOpenAdd}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full font-medium text-sm transition shrink-0"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Thêm Phim</span>
        </button>
      </div>
    </nav>
  );
}

function Hero({ movie, onPlay }) {
  if (!movie) return null;
  
  return (
    <div className="relative w-full h-[70vh] min-h-[500px] mb-8">
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={getHighResThumbnail(movie.videoId)} 
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
      </div>
      
      <div className="absolute bottom-[15%] left-8 md:left-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-green-500 font-bold text-sm">98% Phù hợp</span>
          <span className="border border-zinc-500 text-zinc-300 text-xs px-2 py-0.5 rounded-sm">4K</span>
          {movie.isFull && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Đã Full</span>}
          <span className="text-left text-base font-semibold text-zinc-300">{movie.category}</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight shadow-sm">
          {movie.title}
        </h2>
        <p className="text-lg text-zinc-300 mb-8 line-clamp-3 max-w-xl text-shadow">
          {movie.description || "Một tuyệt tác đáng xem trên nền tảng của chúng tôi. Hãy tận hưởng những giây phút giải trí tuyệt vời."}
        </p>
        
        <div className="flex gap-4">
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-2 bg-white text-black px-8 py-2.5 rounded hover:bg-white/80 transition font-bold text-lg"
          >
            <Play size={24} fill="currentColor" /> Phát ngay
          </button>
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-2 bg-zinc-500/50 text-white px-8 py-2.5 rounded hover:bg-zinc-500/70 transition font-bold text-lg backdrop-blur-sm"
          >
            <Info size={24} /> Chi tiết
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
    <div className="mb-8 relative">
      <h2 className="text-xl font-bold text-white mb-4 px-8">{title}</h2>
      {/* Khung hiển thị phim dạng cuộn dọc, flex-wrap, giới hạn chiều cao 2 dòng */}
      <div 
        className="flex flex-wrap gap-4 pb-4 px-8 max-h-[350px] overflow-y-auto scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {movies.map(movie => (
          <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} onDelete={onDeleteMovie} />
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

function AddMovieModal({ categories, onClose, onAddMovies, existingMovies }) {
  const [activeTab, setActiveTab] = useState('single');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories.length > 1 ? categories[1] : 'Hành động');
  const [description, setDescription] = useState('');
  const [isFull, setIsFull] = useState(false);
  
  const [channelId, setChannelId] = useState('');
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
    } catch (e) {
      console.warn("Could not fetch title automatically");
    }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    const id = extractYoutubeId(val);
    if (id) {
      fetchVideoInfo(id);
    }
  };

  const handleSubmitSingle = (e) => {
    e.preventDefault();
    setError('');
    
    const videoId = extractYoutubeId(url);
    if (!videoId) {
      setError("Link YouTube không hợp lệ.");
      return;
    }

    const isDuplicate = existingMovies.some(m => m.videoId === videoId || m.title.toLowerCase().trim() === title.toLowerCase().trim());
    if (isDuplicate) {
      setError("Phim này (hoặc link video này) đã tồn tại trong thư viện.");
      return;
    }

    const newMovie = {
      id: Date.now().toString(),
      videoId,
      title: title || "Video không có tiêu đề",
      category,
      description,
      isFull
    };
    
    onAddMovies([newMovie]);
    onClose();
  };

  const handleSubmitChannel = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!channelId || !apiKey) {
      setError("Vui lòng nhập Channel ID và API Key.");
      return;
    }

    setLoading(true);
    try {
      let allVideos = [];
      let nextPageToken = '';
      let fetchedCount = 0;
      const limit = Math.min(Math.max(parseInt(maxVideos) || 50, 1), 500);

      while (fetchedCount < limit) {
        const fetchCount = Math.min(50, limit - fetchedCount);
        let fetchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${fetchCount}&type=video`;
        
        if (nextPageToken) {
          fetchUrl += `&pageToken=${nextPageToken}`;
        }

        const res = await fetch(fetchUrl);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        if (!data.items || data.items.length === 0) break;

        const newMovies = data.items
          .filter(item => item.id.videoId)
          .filter(item => {
             const isDupDb = existingMovies.some(m => m.videoId === item.id.videoId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             const isDupLocal = allVideos.some(m => m.videoId === item.id.videoId || m.title.toLowerCase().trim() === item.snippet.title.toLowerCase().trim());
             return !isDupDb && !isDupLocal;
          })
          .map(item => {
             const isVideoFull = detectIsFull(item.snippet.title, item.snippet.description);
             return {
              id: item.id.videoId + '_' + Date.now() + Math.random(),
              videoId: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              category: category,
              isFull: isVideoFull
             };
          });

        allVideos = [...allVideos, ...newMovies];
        fetchedCount += data.items.length;
        nextPageToken = data.nextPageToken;

        if (!nextPageToken) break;
      }

      if (allVideos.length === 0) {
        throw new Error("Không tìm thấy video nào.");
      }

      onAddMovies(allVideos);
      onClose();
    } catch (err) {
      setError("Lỗi khi tải kênh: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-white">Thêm Nội Dung</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X size={24}/></button>
        </div>
        
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'single' ? 'text-white border-b-2 border-red-600 bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
            onClick={() => { setActiveTab('single'); setError(''); }}
          >
            Một Video
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'channel' ? 'text-white border-b-2 border-red-600 bg-zinc-800/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
            onClick={() => { setActiveTab('channel'); setError(''); }}
          >
            Cả Kênh
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-500 rounded text-sm">{error}</div>}
          
          {activeTab === 'single' ? (
            <form onSubmit={handleSubmitSingle} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Link YouTube</label>
                <input 
                  type="text" value={url} onChange={handleUrlChange} required
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Tiêu đề (Tự động tải)</label>
                <input 
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Thể loại</label>
                <input 
                  type="text" 
                  list="category-options"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nhập hoặc chọn thể loại..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                  required
                />
                <datalist id="category-options">
                  {categories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Mô tả (Tùy chọn)</label>
                <textarea 
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition h-20 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isFull} 
                  onChange={(e) => setIsFull(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
                Đánh dấu phim này là Trọn bộ (Đã Full)
              </label>
              <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold transition">
                Thêm Video
              </button>
            </form>
          ) : (
             <form onSubmit={handleSubmitChannel} className="flex flex-col gap-4">
              <div className="text-xs text-blue-400 bg-blue-400/10 p-3 rounded border border-blue-400/20">
                Tính năng này tự động phân tích tiêu đề để gắn nhãn "Đã Full" khi tải video về.
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Channel ID</label>
                <input 
                  type="text" value={channelId} onChange={(e) => setChannelId(e.target.value)} required
                  placeholder="VD: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">YouTube API Key</label>
                <input 
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required
                  placeholder="AIzaSy..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Số lượng video (Tối đa 500)</label>
                <input 
                  type="number" value={maxVideos} onChange={(e) => setMaxVideos(e.target.value)} required
                  min="1" max="500"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Xếp vào Thể loại</label>
                <input 
                  type="text" 
                  list="category-options-channel"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nhập hoặc chọn thể loại..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 focus:border-red-600 outline-none transition"
                  required
                />
                <datalist id="category-options-channel">
                  {categories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <button type="submit" disabled={loading} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold transition disabled:opacity-50">
                {loading ? 'Đang tải...' : 'Nhập Kênh'}
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
useEffect(() => {
    if (!useCloud || !auth) return;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Lỗi xác thực ẩn danh:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const [movies, setMovies] = useState(() => {
    if (!useCloud) {
      const saved = localStorage.getItem('youflix_movies_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
      return initialMovies;
    }
    return [];
  });

  useEffect(() => {
  if (!db) return;

  const moviesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'movies');
  
  const unsubscribe = onSnapshot(moviesCollectionRef, (snapshot) => {
    const cloudMovies = [];
    snapshot.forEach((doc) => {
      cloudMovies.push(doc.data());
    });
    
    if (cloudMovies.length > 0) {
      cloudMovies.sort((a, b) => Number(b.id) - Number(a.id));
      setMovies(cloudMovies); // Cập nhật danh sách từ Firebase
    }
  }, (error) => {
    console.error("Lỗi đọc dữ liệu từ Firestore:", error);
  });

  return () => unsubscribe();
}, [db, appId]);
  
  const [currentCategory, setCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [showOnlyFull, setShowOnlyFull] = useState(false);

  const [user, setUser] = useState(null);

  const dynamicCategories = useMemo(() => {
    const uniqueCats = new Set(movies.map(m => m.category));
    return ['Tất cả', ...Array.from(uniqueCats)];
  }, [movies]);

  useEffect(() => {
    if (!useCloud) {
      localStorage.setItem('youflix_movies_v2', JSON.stringify(movies));
      return;
    }

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

    const saveMovieToCloud = async (newMovie) => {
    if (db) {
      try {
        const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', newMovie.id);
        await setDoc(movieDocRef, newMovie);
      } catch (err) {
        console.error("Lỗi lưu phim lên Firestore:", err);
      }
    }
  };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, [movies]);

  useEffect(() => {
    if (!useCloud || !user) return;

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
  
  const handleAddMovies = async (newMovies) => {
    // Chỉ cần có db và useCloud là cho phép đẩy lên Firestore ngay lập tức
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
      // Fallback nếu không có kết nối cloud
      setMovies(prev => [...newMovies, ...prev]);
    }
  };

  const handleDeleteRequest = (id) => {
    setMovieToDelete(id);
  };

  
  const confirmDelete = async () => {
    if (movieToDelete) {
      // ---> SỬA LẠI ĐOẠN NÀY <---
      if (db) {
        try {
          const movieDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'movies', movieToDelete);
          await deleteDoc(movieDocRef);
        } catch (e) {
          console.error("Lỗi khi xóa phim:", e);
        }
      } else {
        setMovies(prev => prev.filter(m => m.id !== movieToDelete));
      }
      // -------------------------

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
      />

      <main className="pb-20">
        {!searchQuery && currentCategory === 'Tất cả' && <Hero movie={heroMovie} onPlay={setSelectedMovie} />}
        
        <div className={`relative z-10 ${!searchQuery && currentCategory === 'Tất cả' ? '-mt-32' : 'pt-28'}`}>
          {currentCategory === 'Tất cả' && !searchQuery ? (
            dynamicCategories.filter(c => c !== 'Tất cả').map(cat => {
              const catMovies = filteredMovies.filter(m => m.category === cat);
              if (catMovies.length === 0) return null;
              return <MovieRow key={cat} title={cat} movies={catMovies} onMovieClick={setSelectedMovie} onDeleteMovie={handleDeleteRequest} />
            })
          ) : (
            <div className="px-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                {searchQuery ? `Kết quả tìm kiếm cho: "${searchQuery}"` : currentCategory}
                {showOnlyFull && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded uppercase tracking-wider">Đã Full</span>}
              </h2>
              <div className="flex flex-wrap gap-4">
                {filteredMovies.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onClick={setSelectedMovie} onDelete={handleDeleteRequest} />
                ))}
                {filteredMovies.length === 0 && (
                  <p className="text-zinc-500 w-full py-20 text-center">Không tìm thấy nội dung phù hợp với bộ lọc hiện tại.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 flex flex-col items-center text-center text-zinc-600 text-sm gap-2">
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
    </div>
  );
}