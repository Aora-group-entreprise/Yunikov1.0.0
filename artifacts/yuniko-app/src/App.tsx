import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Router, Route, Switch, useLocation, useParams } from "wouter";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  BookmarkIcon,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Globe,
  Grid3X3,
  Hash,
  Heart,
  Home as HomeIcon,
  Image as ImageIcon,
  Info,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  MoreHorizontal,
  Moon,
  Paperclip,
  Phone,
  Play,
  Plus,
  Search as SearchIcon,
  Send,
  Settings as SettingsIcon,
  Share2,
  Shield,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Users,
  Video,
  WifiOff,
  X,
} from "lucide-react";
import "./index.css";
import { supabase } from "./lib/supabase";
import { signIn, registerUser, signOut } from "./features/auth/service";
import { getMyProfile, updateProfile as updateRemoteProfile } from "./features/profile/service";
import { followUser, unfollowUser } from "./features/follow/service";
import { getHomeFeed, createPost as createRemotePost } from "./features/feed/service";
import { toggleLike as toggleRemoteLike, toggleSave as toggleRemoteSave, addComment as addRemoteComment, sharePost as shareRemotePost, listComments as listRemoteComments } from "./features/interactions/service";
import { listNotifications, markNotificationsRead, subscribeToNotifications } from "./features/notifications/service";

const GRADIENT = "linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)";
const IMG = {
  neon: "/scene-neon.jpg",
  roof: "/scene-rooftop.jpg",
  flower: "/scene-flower.jpg",
  dj: "/scene-dj.jpg",
};

type Theme = "dark" | "light";
type DemoUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  verified?: boolean;
};
type DemoPost = {
  id: string;
  user: DemoUser;
  image: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  location?: string;
};
type DemoStory = { id: string; user: DemoUser; image: string; viewed?: boolean };
type DemoState = {
  liked: string[];
  saved: string[];
  following: string[];
  comments: Record<string, string[]>;
  storyReplies: Record<string, string[]>;
  messages: Record<string, string[]>;
  archived: string[];
  blocked: string[];
  theme: Theme;
  privateProfile: boolean;
  messageRequests: boolean;
  twoFactor: boolean;
  loginAlerts: boolean;
  notifications: boolean;
  accountEmail: string;
  profile: Pick<DemoUser, "displayName" | "username" | "bio" | "avatar">;
  posts: DemoPost[];
  stories: DemoStory[];
};

const currentUser: DemoUser = {
  id: "me",
  username: "maya.chen",
  displayName: "Maya Chen",
  avatar: IMG.neon,
  bio: "Collecting little sparks from everywhere.",
  followers: 1248,
  following: 384,
  posts: 87,
  verified: true,
};
const people: DemoUser[] = [
  currentUser,
  { id: "1", username: "sofia.park", displayName: "Sofia Park", avatar: IMG.roof, bio: "Light leaks and late trains.", followers: 4820, following: 612, posts: 132 },
  { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatar: IMG.dj, bio: "Sound, motion, after dark.", followers: 905, following: 202, posts: 64, verified: true },
  { id: "3", username: "lina.rose", displayName: "Lina Rose", avatar: IMG.flower, bio: "A soft spot for strange flowers.", followers: 3204, following: 244, posts: 210 },
];
const basePosts: DemoPost[] = [
  { id: "p1", user: people[1], image: IMG.roof, caption: "Found a little more color on the way home.", hashtags: ["#nightwalk", "#citylight"], likes: 1247, comments: 38, shares: 17, views: 8400, location: "Seoul, South Korea" },
  { id: "p2", user: people[2], image: IMG.dj, caption: "The room changes when the bass comes in.", hashtags: ["#afterdark", "#soundcheck"], likes: 892, comments: 24, shares: 12, views: 5200 },
  { id: "p3", user: people[3], image: IMG.flower, caption: "Tiny worlds hiding in plain sight.", hashtags: ["#softfocus"], likes: 634, comments: 19, shares: 8, views: 3100, location: "Lisbon, Portugal" },
];
const baseStories: DemoStory[] = [
  { id: "s1", user: people[1], image: IMG.roof },
  { id: "s2", user: people[2], image: IMG.dj },
  { id: "s3", user: people[3], image: IMG.flower, viewed: true },
];

const defaultState: DemoState = {
  liked: [],
  saved: [],
  following: [],
  comments: { p1: ["Love the colors in this one.", "This feels like a whole movie."], p2: ["The energy is perfect."], p3: [] },
  storyReplies: {},
  messages: { "1": ["That light is unreal.", "I know, right? It felt like the whole street was glowing."], "2": ["See you after soundcheck."], "3": ["Sent a photo"] },
  archived: [],
  blocked: [],
  theme: "dark",
  privateProfile: false,
  messageRequests: true,
  twoFactor: false,
  loginAlerts: true,
  notifications: true,
  accountEmail: "maya.chen@example.com",
  profile: { displayName: currentUser.displayName, username: currentUser.username, bio: currentUser.bio, avatar: currentUser.avatar },
  posts: basePosts,
  stories: baseStories,
};

type StoreContextValue = {
  state: DemoState;
  activeUser: DemoUser;
  getUser: (id?: string) => DemoUser;
  toast: string | null;
  showToast: (message: string) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  addComment: (postId: string, comment: string) => void;
  addStoryReply: (storyId: string, reply: string) => void;
  sendMessage: (userId: string, message: string) => void;
  archiveConversation: (userId: string) => void;
  addPost: (input: { caption: string; image?: string; mediaFile?: File; location?: string; hashtags?: string[] }) => void;
  addStory: (input: { caption: string; image?: string }) => void;
  updateProfile: (profile: Partial<DemoState["profile"]>) => void;
  updateState: (patch: Partial<DemoState>) => void;
  toggleBlocked: (userId: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
function loadState(): DemoState {
  try {
    const saved = localStorage.getItem("yuniko-demo-state");
    if (!saved) return defaultState;
    return { ...defaultState, ...JSON.parse(saved), profile: { ...defaultState.profile, ...JSON.parse(saved).profile } };
  } catch {
    return defaultState;
  }
}
function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const activeUser = useMemo(() => ({ ...currentUser, ...state.profile }), [state.profile]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      if (!mounted || !userId) return;
      setRemoteUserId(userId);
      const [profileResult, feedResult] = await Promise.all([getMyProfile(userId), getHomeFeed()]);
      if (!mounted) return;
      if (profileResult.data) {
        const p = profileResult.data;
        setState(previous => ({
          ...previous,
          profile: { displayName: p.display_name, username: p.username, bio: p.bio, avatar: p.avatar_url ?? "" },
        }));
      }
      if (feedResult.data) {
        const posts: DemoPost[] = feedResult.data.map(post => ({
          id: String(post.id),
          user: post.author ? {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.display_name,
            avatar: post.author.avatar_url ?? "",
            bio: "",
            followers: 0,
            following: 0,
            posts: 0,
          } : activeUser,
          image: post.media_url ?? IMG.neon,
          caption: post.caption,
          hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
          likes: post.likes ?? 0,
          comments: post.comments ?? 0,
          shares: post.shares ?? 0,
          views: post.views ?? 0,
          location: post.location ?? undefined,
        }));
        setState(previous => ({ ...previous, posts }));
      }
    };
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setRemoteUserId(null);
      else if (session?.user.id) setRemoteUserId(session.user.id);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const toggleArrayValue = useCallback((key: "liked" | "saved", value: string) => {
    setState(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value] }));
  }, []);

  const toggleFollowRemote = useCallback(async (userId: string) => {
    if (!remoteUserId) return;
    const wasFollowing = state.following.includes(userId);
    setState(previous => ({ ...previous, following: wasFollowing ? previous.following.filter(item => item !== userId) : [...previous.following, userId] }));
    const result = wasFollowing ? await unfollowUser(remoteUserId, userId) : await followUser(remoteUserId, userId);
    if (result.error) {
      setState(previous => ({ ...previous, following: wasFollowing ? [...previous.following, userId] : previous.following.filter(item => item !== userId) }));
      showToast("Could not update follow");
    }
  }, [remoteUserId, state.following, showToast]);

  const addPost = useCallback(async (input: { caption: string; image?: string; mediaFile?: File; location?: string; hashtags?: string[] }) => {
    if (!remoteUserId) { showToast("Sign in required"); return; }
    const result = await createRemotePost(remoteUserId, {
      caption: input.caption,
      mediaUrl: input.image,
      mediaType: "image",
      location: input.location,
      hashtags: input.hashtags ?? [],
      visibility: "public",
    });
    if (result.error) { showToast(result.error.message); return; }
    showToast("Post published");
    const feed = await getHomeFeed();
    if (feed.data) {
      setState(previous => ({ ...previous, posts: feed.data.map(post => ({
        id: String(post.id),
        user: post.author ? { id: post.author.id, username: post.author.username, displayName: post.author.display_name, avatar: post.author.avatar_url ?? "", bio: "", followers: 0, following: 0, posts: 0 } : activeUser,
        image: post.media_url ?? IMG.neon, caption: post.caption, hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        likes: post.likes ?? 0, comments: post.comments ?? 0, shares: post.shares ?? 0, views: post.views ?? 0, location: post.location ?? undefined,
      })) }));
    }
  }, [remoteUserId, activeUser, showToast]);

  const addStory = useCallback((input: { caption: string; image?: string }) => {
    setState(previous => ({ ...previous, stories: [{ id: `s-${Date.now()}`, user: activeUser, image: input.image || IMG.neon }, ...previous.stories] }));
    showToast("Story shared");
  }, [activeUser, showToast]);

  const saveProfile = useCallback(async (profile: Partial<DemoState["profile"]>) => {
    setState(previous => ({ ...previous, profile: { ...previous.profile, ...profile } }));
    if (!remoteUserId) return;
    const result = await updateRemoteProfile(remoteUserId, {
      display_name: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      avatar_url: profile.avatar,
    });
    if (result.error) showToast("Profile update failed");
  }, [remoteUserId, showToast]);

  const value: StoreContextValue = {
    state,
    activeUser,
    getUser: id => id === "me" || !id ? activeUser : people.find(person => person.id === id) ?? people[1],
    toast,
    showToast,
    toggleLike: id => toggleArrayValue("liked", id),
    toggleSave: id => toggleArrayValue("saved", id),
    toggleFollow: id => { void toggleFollowRemote(id); },
    addComment: (id, comment) => { void addCommentRemote(id, comment); },
    addStoryReply: (id, reply) => setState(previous => ({ ...previous, storyReplies: { ...previous.storyReplies, [id]: [...(previous.storyReplies[id] || []), reply] } })),
    sendMessage: (id, message) => setState(previous => ({ ...previous, messages: { ...previous.messages, [id]: [...(previous.messages[id] || []), message] } })),
    archiveConversation: id => setState(previous => ({ ...previous, archived: previous.archived.includes(id) ? previous.archived.filter(item => item !== id) : [...previous.archived, id] })),
    addPost,
    addStory,
    updateProfile: profile => { void saveProfile(profile); },
    updateState: patch => setState(previous => ({ ...previous, ...patch })),
    toggleBlocked: id => setState(previous => ({ ...previous, blocked: previous.blocked.includes(id) ? previous.blocked.filter(item => item !== id) : [...previous.blocked, id] })),
  };
  return <StoreContext.Provider value={value}>{children}<ToastHost /></StoreContext.Provider>;
}
function useDemo() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useDemo must be used inside StoreProvider");
  return value;
}
function ToastHost() {
  const { toast } = useDemo();
  return <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] rounded-full bg-white text-[#170f21] px-5 py-3 text-sm font-semibold shadow-2xl whitespace-nowrap">{toast}</motion.div>}</AnimatePresence>;
}

function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function Avatar({ user, size = "md", ring = false }: { user: DemoUser; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  const sizes = { sm: "w-8 h-8", md: "w-11 h-11", lg: "w-20 h-20" };
  return <div className={`${sizes[size]} rounded-full p-[2px] shrink-0`} style={ring ? { background: GRADIENT } : undefined}><div className="w-full h-full rounded-full overflow-hidden bg-white/10">{user.avatar ? <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white/80 font-bold">{initials(user.displayName)}</span>}</div></div>;
}
function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDone, 1750); return () => window.clearTimeout(timer); }, [onDone]);
  return <motion.div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gradient-bg" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }}><motion.div initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .55, ease: [0.34, 1.56, 0.64, 1] }} className="flex flex-col items-center gap-4"><div className="w-28 h-28 rounded-3xl bg-white/15 flex items-center justify-center shadow-2xl"><Sparkles size={50} className="text-white" strokeWidth={1.6} /></div><motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22 }} className="text-white text-4xl font-black tracking-tight">Yuniko</motion.span><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .48 }} className="mt-10 flex flex-col items-center gap-1"><span className="text-white/90 text-sm font-semibold tracking-wide">Aora Group</span><div className="flex gap-1.5 mt-3">{[0, 1, 2].map((i) => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/75" animate={{ scale: [1, 1.4, 1], opacity: [.7, 1, .7] }} transition={{ repeat: Infinity, duration: .9, delay: i * .18 }} />)}</div></motion.div></motion.div></motion.div>;
}

function BottomNav() {
  const [location, navigate] = useLocation();
  const items = [{ path: "/", label: "Home", icon: HomeIcon }, { path: "/notifications", label: "Alerts", icon: Bell }, { path: "/messages", label: "Messages", icon: MessageCircle }, { path: "/profile", label: "Profile", icon: User }];
  const active = (path: string) => path === "/" ? location === "/" : location.startsWith(path);
  return <nav className="fixed bottom-0 left-0 right-0 z-50 yuniko-bottom-nav glass border-t border-pink-400/15"><div className="flex items-center justify-around h-16 max-w-[1120px] mx-auto px-2">{items.slice(0, 2).map(({ path, label, icon: Icon }) => <NavButton key={path} path={path} label={label} icon={Icon} active={active(path)} navigate={navigate} />)}<motion.button aria-label="Create" onClick={() => navigate("/create")} whileTap={{ scale: .88 }} className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: GRADIENT, boxShadow: "0 0 24px rgba(255,0,110,.45)" }}><Plus size={25} className="text-white" strokeWidth={2.8} /></motion.button>{items.slice(2).map(({ path, label, icon: Icon }) => <NavButton key={path} path={path} label={label} icon={Icon} active={active(path)} navigate={navigate} />)}</div></nav>;
}
function NavButton({ path, label, icon: Icon, active, navigate }: { path: string; label: string; icon: typeof HomeIcon; active: boolean; navigate: (path: string) => void }) {
  return <button aria-label={label} onClick={() => navigate(path)} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative"><Icon size={22} style={{ color: active ? "#FF3D9A" : "rgba(255,255,255,.45)" }} strokeWidth={active ? 2.3 : 1.7} /><span className="text-[10px]" style={{ color: active ? "#FF3D9A" : "rgba(255,255,255,.38)" }}>{label}</span><span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-400" style={{ opacity: active ? 1 : 0 }} /></button>;
}
function PageShell({ children, nav = true, className = "" }: { children: ReactNode; nav?: boolean; className?: string }) {
  const { state } = useDemo();
  return <div className={`w-full min-h-screen ${state.theme === "light" ? "yuniko-light bg-[#f7f3fb] text-[#17121f]" : "bg-[#0d0b14] text-white"} ${nav ? "pb-20" : ""} ${className}`}>{children}{nav && <BottomNav />}</div>;
}
function TopBar({ title, back = true, action }: { title: string; back?: boolean; action?: ReactNode }) {
  const [, navigate] = useLocation();
  return <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3 glass border-b border-white/[.06]">{back && <button aria-label="Back" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}><ArrowLeft size={22} className="text-white/80" /></button>}<h1 className="text-base font-semibold flex-1">{title}</h1>{action}</header>;
}
function StoryStrip() {
  const [, navigate] = useLocation();
  const { state, activeUser } = useDemo();
  return <div className="absolute inset-x-0 z-40 h-[78px] top-14 glass border-b border-white/5"><div className="flex items-center gap-3 h-full px-3 overflow-x-auto no-scrollbar"><motion.button whileTap={{ scale: .9 }} onClick={() => navigate("/create?mode=story")} className="flex flex-col items-center gap-1 min-w-16"><div className="relative w-[54px] h-[54px] rounded-full p-[2px] border-2 border-dashed border-pink-400/50"><Avatar user={activeUser} size="md" /><span className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#0d0b14]" style={{ background: GRADIENT }}><Plus size={9} /></span></div><span className="text-white/65 text-[10px]">Your story</span></motion.button>{state.stories.map((story) => <motion.button key={story.id} whileTap={{ scale: .9 }} onClick={() => navigate(`/story/${story.id}`)} className="flex flex-col items-center gap-1 min-w-16"><div className="w-[54px] h-[54px] rounded-full p-[2px]" style={{ background: story.viewed ? "rgba(255,255,255,.14)" : GRADIENT }}><div className="w-full h-full rounded-full overflow-hidden border-2 border-[#0d0b14]"><img src={story.user.avatar} alt={story.user.displayName} className="w-full h-full object-cover" /></div></div><span className="text-white/65 text-[10px] truncate max-w-[60px]">{story.user.displayName.split(" ")[0]}</span></motion.button>)}</div></div>;
}

function PostCard({ post }: { post: DemoPost }) {
  const [, navigate] = useLocation();
  const { state, toggleLike, toggleSave, addComment, toggleFollow, showToast } = useDemo();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);
  const liked = state.liked.includes(post.id);
  const saved = state.saved.includes(post.id);
  const following = state.following.includes(post.user.id);
  const postComments = state.comments[post.id] || [];
  const tapImage = () => { const now = Date.now(); if (now - lastTap.current < 320) { if (!liked) toggleLike(post.id); setBurst(true); window.setTimeout(() => setBurst(false), 700); } lastTap.current = now; };
  const share = async () => { const url = `${window.location.origin}/post/${post.id}`; try { if (navigator.share) await navigator.share({ title: "Yuniko post", url }); else await navigator.clipboard?.writeText(url); if (/^\\d+$/.test(post.id)) { const result = await shareRemotePost(Number(post.id), navigator.share ? "web_share" : "copy"); if (result.error) throw result.error; } showToast("Post link shared"); } catch { showToast("Sharing cancelled"); } };
  const submitComment = (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; addComment(post.id, comment.trim()); setComment(""); showToast("Comment added"); };
  return <div className="relative w-full h-full"><img src={post.image} alt={post.caption} className="absolute inset-0 w-full h-full object-cover cursor-pointer" onClick={tapImage} /><div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.22) 50%,transparent 72%)" }} /><div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/40 backdrop-blur-md"><Eye size={12} className="text-white/75" /><span className="text-white/80 text-[11px] font-semibold">{post.views.toLocaleString()}</span></div><motion.button whileTap={{ scale: .88 }} aria-label="Open post" onClick={() => navigate(`/post/${post.id}`)} className="absolute top-3 right-3 p-2 rounded-full bg-black/35 backdrop-blur-md"><MoreHorizontal size={18} /></motion.button><AnimatePresence>{burst && <motion.div initial={{ scale: .4, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: .65 }} className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart size={100} className="fill-red-500 text-red-500" /></motion.div>}</AnimatePresence><div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10"><ActionButton label={String(post.likes)} onClick={() => toggleLike(post.id)}><Heart size={25} className={liked ? "fill-red-500 text-red-500" : "text-white"} strokeWidth={1.8} /></ActionButton><ActionButton label={String(postComments.length)} onClick={() => setCommentsOpen(true)}><MessageCircle size={25} strokeWidth={1.8} /></ActionButton><ActionButton label={String(post.shares)} onClick={share}><Share2 size={25} strokeWidth={1.8} /></ActionButton><ActionButton label={saved ? "Saved" : "Save"} onClick={() => { toggleSave(post.id); showToast(saved ? "Removed from saved" : "Saved for later"); }}><Bookmark size={25} className={saved ? "fill-yellow-400 text-yellow-400" : ""} strokeWidth={1.8} /></ActionButton></div><div className="absolute bottom-4 left-3 right-20 z-10"><div className="flex items-center gap-2.5 mb-1.5"><button onClick={() => navigate(`/user/${post.user.id}`)}><Avatar user={post.user} size="sm" ring /></button><div className="flex-1 min-w-0"><button onClick={() => navigate(`/user/${post.user.id}`)} className="font-semibold text-sm">{post.user.displayName}</button><p className="text-white/55 text-xs">{post.location ?? "World Feed"}</p></div>{post.user.id !== "me" && <button onClick={() => { toggleFollow(post.user.id); showToast(following ? `Unfollowed ${post.user.displayName}` : `Following ${post.user.displayName}`); }} className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/15">{following ? "Following" : "Follow"}</button>}</div><p className="text-white text-sm font-medium leading-snug line-clamp-2">{post.caption}</p><p className="text-pink-300 text-sm mt-0.5">{post.hashtags.join(" ")}</p><p className="text-white/40 text-xs mt-0.5">2h ago</p></div><AnimatePresence>{commentsOpen && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60" onClick={() => setCommentsOpen(false)} /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 340 }} className="fixed bottom-0 left-0 right-0 mx-auto z-[61] max-w-[1100px] rounded-t-3xl flex flex-col" style={{ maxHeight: "72vh", background: "rgba(14,11,24,.98)", border: "1px solid rgba(255,255,255,.09)" }}><div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" /><div className="flex items-center justify-between px-5 py-4 border-b border-white/10"><span className="font-semibold text-sm">Comments ({postComments.length})</span><button onClick={() => setCommentsOpen(false)}><X size={18} className="text-white/60" /></button></div><div className="flex-1 overflow-y-auto p-5">{postComments.length === 0 ? <p className="text-white/40 text-sm text-center py-8">Be the first to comment.</p> : postComments.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3 mb-5"><Avatar user={people[index % people.length]} size="sm" /><p className="text-white/80 text-sm">{item}</p></div>)}</div><form className="flex items-center gap-3 p-4 border-t border-white/10 pb-safe" onSubmit={submitComment}><input aria-label="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" className="flex-1 bg-white/[.06] border border-white/10 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/35" /><button aria-label="Send comment" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: comment.trim() ? GRADIENT : "rgba(255,255,255,.08)" }}><Send size={15} /></button></form></motion.div></>}</AnimatePresence></div>;
}
function ActionButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) { return <motion.button whileTap={{ scale: .85 }} onClick={onClick} className="flex flex-col items-center gap-0.5"><span className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center">{children}</span><span className="text-white text-[11px] font-medium">{label}</span></motion.button>; }

function Home() {
  const [, navigate] = useLocation();
  const { state } = useDemo();
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  return <PageShell><div className="relative w-full min-h-screen bg-[#0d0b14] overflow-hidden"><header className="absolute inset-x-0 top-0 z-50 h-14 flex items-center justify-between gap-2 px-3 min-[360px]:px-4 glass border-b border-pink-400/10"><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-2xl font-black gradient-text">Yuniko</button><button onClick={() => setWorldMenu(!worldMenu)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[.06] border border-pink-400/30 text-white/90 text-xs min-[360px]:text-sm"><Globe size={12} />World Feed<ChevronDown size={11} /></button><div className="flex items-center gap-3"><button aria-label="Search" onClick={() => navigate("/search")}><SearchIcon size={20} className="text-white/75" /></button><button aria-label="Add friends" onClick={() => navigate("/add-friends")}><UserPlus size={20} className="text-white/75" /></button></div></header><StoryStrip />{worldMenu && <><button className="fixed inset-0 z-40 cursor-default" onClick={() => setWorldMenu(false)} aria-label="Close menu" /><motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="absolute top-[60px] left-1/2 -translate-x-1/2 w-44 rounded-2xl z-50 overflow-hidden bg-[#120e1e] border border-pink-400/25"><button onClick={() => setWorldMenu(false)} className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"><Globe size={13} />World Feed</button><button onClick={() => { setWorldMenu(false); navigate("/search?tag=nightwalk"); }} className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"><Hash size={13} />Trending tags</button></motion.div></>}{!online && <div className="absolute inset-x-0 top-[134px] z-40 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/85"><WifiOff size={12} /><span className="text-xs">Offline mode</span></div>}<div className="absolute inset-x-0 top-[134px] bottom-[64px] overflow-y-scroll snap-y snap-mandatory no-scrollbar" data-testid="posts-feed">{state.posts.map((post) => <div key={post.id} className="relative w-full max-w-[920px] mx-auto px-2 py-1 snap-start snap-always" style={{ height: "calc(100dvh - 198px)", minHeight: 480 }}><div className="relative w-full h-full rounded-2xl overflow-hidden"><PostCard post={post} /></div></div>)}</div></div></PageShell>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!email.trim() || !password) { setError("Please enter your email and password"); return; }
    try {
      const result = await signIn({ email: email.trim(), password });
      if (result.error) { setError(result.error.message); return; }
      onLogin(); navigate("/");
    } catch (error) { setError(error instanceof Error ? error.message : "Sign in failed"); }
  };
  const Field = ({ icon, value, onChange, placeholder, type = "text", suffix }: { icon: ReactNode; value: string; onChange: (value: string) => void; placeholder: string; type?: string; suffix?: ReactNode }) => <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[.06] border border-white/10">{icon}<input type={type} value={value} onChange={(event) => { onChange(event.target.value); setError(""); }} placeholder={placeholder} className="flex-1 bg-transparent text-white/90 text-sm outline-none placeholder:text-white/30" />{suffix}</div>;
  return <PageShell nav={false} className="flex flex-col"><div className="relative flex flex-col items-center justify-end px-6 pt-14 pb-7 min-h-[220px]"><div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(255,0,110,.17),rgba(139,0,255,.13) 60%,transparent)" }} /><div className="relative flex flex-col items-center"><div className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center mb-3" style={{ background: GRADIENT, boxShadow: "0 0 44px rgba(255,0,110,.45)" }}><Sparkles size={35} /></div><h1 className="text-2xl font-black gradient-text">Yuniko</h1></div></div><div className="flex-1 w-full max-w-lg mx-auto px-6 pb-10"><AnimatePresence mode="wait" initial={false}>{mode === "signin" && <motion.form key="signin" onSubmit={submit} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}><div className="flex p-1 rounded-2xl mb-6 bg-white/[.06] border border-white/10"><button type="button" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: GRADIENT }}>Sign In</button><button type="button" onClick={() => { setMode("signup"); setError(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50">Sign Up</button></div><div className="flex flex-col gap-3 mb-4"><Field icon={<User size={18} className="text-white/40" />} value={email} onChange={setEmail} placeholder="Email" /><Field icon={<Lock size={18} className="text-white/40" />} value={password} onChange={setPassword} placeholder="Password" type={showPw ? "text" : "password"} suffix={<button type="button" aria-label="Toggle password" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} className="text-white/40" /> : <Eye size={16} className="text-white/40" />}</button>} /></div><div className="text-right mb-5"><button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="text-sm text-pink-400">Forgot Password?</button></div>{error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}<button type="submit" className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: GRADIENT, boxShadow: "0 4px 20px rgba(255,0,110,.35)" }}>Sign In <ArrowRight size={16} /></button><p className="text-center text-white/40 text-sm mt-5">Don't have an account? <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="font-semibold text-pink-400">Sign Up</button></p></motion.form>}{mode === "signup" && <motion.div key={`signup-${step}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}><div className="flex items-center justify-between mb-5"><button onClick={() => step === 1 ? setMode("signin") : setStep(step - 1)}><ArrowLeft size={20} className="text-white/60" /></button><div className="flex gap-1.5">{[1, 2, 3].map((n) => <span key={n} className="h-1.5 rounded-full transition-all" style={{ width: step === n ? 20 : 6, background: n <= step ? GRADIENT : "rgba(255,255,255,.18)" }} />)}</div><span className="w-6" /></div>{step === 1 && <><h2 className="text-xl font-bold mb-1">Create account</h2><p className="text-white/40 text-sm mb-5">Choose a unique username</p><div className="flex flex-col gap-3 mb-5"><Field icon={<span className="text-white/40">@</span>} value={username} onChange={setUsername} placeholder="username" />\n                  <Field icon={<span className="text-white/40">@</span>} value={email} onChange={setEmail} placeholder="email" type="email" /><Field icon={<Lock size={18} className="text-white/40" />} value={password} onChange={setPassword} placeholder="Password (min 6 characters)" type="password" /><Field icon={<Lock size={18} className="text-white/40" />} value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type="password" /></div><button onClick={() => { if (username.length < 3 || password.length < 6 || password !== confirmPassword) setError("Use 3+ characters and matching passwords."); else { setError(""); setStep(2); } }} className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: GRADIENT }}>Continue <ArrowRight size={16} /></button></>}{step === 2 && <><h2 className="text-xl font-bold mb-1">About you</h2><p className="text-white/40 text-sm mb-5">Help others find and know you</p><div className="flex flex-col gap-3 mb-5"><Field icon={<User size={18} className="text-white/40" />} value={name} onChange={setName} placeholder="Display name" /><Field icon={<Globe size={18} className="text-white/40" />} value="" onChange={() => undefined} placeholder="Where are you from?" /><Field icon={<Users size={18} className="text-white/40" />} value="" onChange={() => undefined} placeholder="Your age" type="number" /></div><button onClick={() => setStep(3)} className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: GRADIENT }}>Continue <ArrowRight size={16} /></button></>}{step === 3 && <><h2 className="text-xl font-bold mb-1">Add your photo</h2><p className="text-white/40 text-sm mb-6">Help people recognize you</p><div className="flex justify-center mb-5"><div className="w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed border-white/20 bg-white/[.06]"><Camera size={28} className="text-pink-400" /></div></div><button onClick={async () => {
                      if (username.length < 3 || password.length < 6 || password !== confirmPassword || !email.includes("@")) { setError("Use a valid email, 3+ character username and matching password."); return; }
                      try {
                        const result = await registerUser({ email: email.trim(), username: username.trim(), displayName: name.trim() || username.trim(), password });
                        if (result.error) { setError(result.error.message); return; }
                        if (result.data.session) { onLogin(); navigate("/"); } else { setError("Check your email to confirm your account, then sign in."); setMode("signin"); }
                      } catch (error) { setError(error instanceof Error ? error.message : "Account creation failed"); }
                    }} className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: GRADIENT }}>Create Account <ArrowRight size={16} /></button><button onClick={() => { setMode("signin"); setError(""); }} className="w-full py-3 text-white/35 text-sm mt-2">Back to sign in</button></>}</motion.div>}{mode === "forgot" && <motion.form key="forgot" onSubmit={(event) => { event.preventDefault(); if (!username.trim()) setError("Please enter your username"); else { setError(""); setMode("signin"); } }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}><button type="button" onClick={() => setMode("signin")} className="mb-5"><ArrowLeft size={20} className="text-white/60" /></button><h2 className="text-xl font-bold mb-1">Reset password</h2><p className="text-white/40 text-sm mb-5">Enter your username to continue</p><Field icon={<User size={18} className="text-white/40" />} value={username} onChange={setUsername} placeholder="Your username" />{error && <p className="text-red-400 text-xs text-center mt-4">{error}</p>}<button type="submit" className="w-full py-4 mt-5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: GRADIENT }}>Continue <ArrowRight size={16} /></button></motion.form>}</AnimatePresence></div></PageShell>;
}

function Notifications() {
  const [, navigate] = useLocation();
  const { state, toggleFollow, showToast } = useDemo();
  const [remoteNotifications, setRemoteNotifications] = useState<Array<{id:number;actor_id:number|null;type:string;post_id:number|null;message:string;created_at:string;read_at:string|null}>>([]);
  const refresh = useCallback(async () => { const result = await listNotifications(); if (result.data) setRemoteNotifications(result.data as typeof remoteNotifications); }, []);
  useEffect(() => {
    void refresh();
    void markNotificationsRead();
    let channel: any;
    void subscribeToNotifications(() => { void refresh(); }).then((value) => { channel = value; });
    return () => { if (channel) void channel.unsubscribe(); };
  }, [refresh]);
  return <PageShell><TopBar title="Notifications" back={false}/><div className="px-4 pt-4">
    {remoteNotifications.length > 0 ? remoteNotifications.map((item) => <button key={item.id} onClick={() => item.post_id ? navigate(`/post/${item.post_id}`) : undefined} className="w-full flex items-center gap-3 py-4 border-b border-white/5 text-left"><div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10"><Bell size={18}/></div><p className="text-sm text-white/80 flex-1"><b>{item.type}</b> {item.message} <span className="text-white/40">{new Date(item.created_at).toLocaleString()}</span></p></button>) : <><button onClick={() => navigate(`/post/p1`)} className="w-full flex items-center gap-3 py-4 border-b border-white/5 text-left"><Avatar user={people[2]} size="md" ring /><p className="text-sm text-white/80 flex-1"><b>Noah Reyes</b> liked your post <span className="text-white/40">2m</span></p><img src={IMG.flower} alt="" className="w-12 h-12 rounded-lg object-cover" /></button><div className="flex items-center gap-3 py-4 border-b border-white/5"><Avatar user={people[3]} size="md" ring /><p className="text-sm text-white/80 flex-1"><b>Lina Rose</b> started following you <span className="text-white/40">1h</span></p><button onClick={() => { toggleFollow("3"); showToast(state.following.includes("3") ? "Unfollowed Lina Rose" : "Following Lina Rose"); }} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: state.following.includes("3") ? "rgba(255,255,255,.12)" : GRADIENT }}>{state.following.includes("3") ? "Following" : "Follow back"}</button></div></>}
  </div></PageShell>;
}
