import React, { useState } from 'react';
import { 
  MessageSquare, 
  Share2, 
  Heart, 
  Plus, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Check, 
  UserPlus, 
  Image as ImageIcon, 
  Video, 
  Code, 
  Smile, 
  Bookmark, 
  Settings, 
  Compass, 
  Gamepad2, 
  Home, 
  Send, 
  X,
  PlusCircle,
  FileCode
} from 'lucide-react';
import { DEV_AVATARS, PROFILE_AVATAR_YOU, IMAGE_SEED_MAP } from '../../assets/images';

interface Reply {
  id: string;
  author: string;
  avatar: string;
  text: string;
  isOP?: boolean;
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  nestedReplies: Reply[];
}

interface Post {
  id: string;
  author: string;
  avatar: string;
  date: string;
  tag: string;
  body: string;
  image?: string;
  likes: number;
  hasLiked?: boolean;
  shares: number;
  reactions: {
    fire: number;
    rocket: number;
  };
  comments: Comment[];
}

interface CommunityHubProps {
  darkMode: boolean;
  onNavigateToSeller?: () => void;
  onNavigateToMarketplace?: () => void;
}

export function CommunityHub({ darkMode, onNavigateToSeller, onNavigateToMarketplace }: CommunityHubProps) {
  // Navigation active state inside Community Side Panel
  const [activeSideNav, setActiveSideNav] = useState<'home' | 'discover' | 'library' | 'community' | 'settings'>('community');
  
  // Custom filtering state based on trending tags
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Suggested Developers to follow
  const [suggestedDevs, setSuggestedDevs] = useState([
    {
      id: 'gdsage',
      name: 'GDSage',
      specialty: 'Shader Expert',
      avatar: DEV_AVATARS.gdsage,
      isFollowing: false,
      followersCount: 1420
    },
    {
      id: 'vectorvixen',
      name: 'VectorVixen',
      specialty: 'UI/UX Guru',
      avatar: DEV_AVATARS.vectorvixen,
      isFollowing: false,
      followersCount: 980
    }
  ]);

  // Feed posts state
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 'post_1',
      author: 'PixelWizard',
      avatar: DEV_AVATARS.pixelwizard,
      date: '2 hours ago',
      tag: '#Shaders',
      body: 'Just finished this procedural water shader for our upcoming project. The refraction logic is finally clicking! 🌊 What do you think about the foam density?',
      image: IMAGE_SEED_MAP.forest,
      likes: 124,
      hasLiked: false,
      shares: 8,
      reactions: { fire: 12, rocket: 5 },
      comments: [
        {
          id: 'comment_1_1',
          author: 'CodeMistress',
          avatar: DEV_AVATARS.codemistress,
          text: 'The vertex displacement looks incredibly smooth. Are you using a flow map for those swirls?',
          nestedReplies: [
            {
              id: 'reply_1_1_1',
              author: 'PixelWizard',
              avatar: DEV_AVATARS.jammer1,
              text: "Exactly! It's a custom noise-based flow map generated right in Godot.",
              isOP: true
            }
          ]
        }
      ]
    },
    {
      id: 'post_2',
      author: 'AssetLord_99',
      avatar: DEV_AVATARS.assetlord,
      date: '5 hours ago',
      tag: '#Godot4',
      body: 'Character concept for the Jam! Working on a "Lush Sky" theme. This character is a Wind Mage who navigates via pixelated clouds. 🌬️✨ We might list this character model structure under customizable mesh features later.',
      image: IMAGE_SEED_MAP.sky,
      likes: 89,
      hasLiked: false,
      shares: 2,
      reactions: { fire: 4, rocket: 2 },
      comments: []
    }
  ]);

  // Input states for writing a new post
  const [postText, setPostText] = useState('');
  const [postTag, setPostTag] = useState('#Godot4');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Input states for active comment boxes - mapped by post ID
  const [activeCommentTexts, setActiveCommentTexts] = useState<{ [postId: string]: string }>({});
  
  // Track which post ID has the comment sector expanded
  const [expandedPostComments, setExpandedPostComments] = useState<{ [postId: string]: boolean }>({
    'post_1': true
  });

  // Track active sub-reply inputs - mapped by comment ID
  const [activeReplyTexts, setActiveReplyTexts] = useState<{ [commentId: string]: string }>({});
  const [expandedReplyInputs, setExpandedReplyInputs] = useState<{ [commentId: string]: boolean }>({});

  // Handlers
  const handleFollowDev = (devId: string) => {
    setSuggestedDevs(prev => prev.map(dev => {
      if (dev.id === devId) {
        return {
          ...dev,
          isFollowing: !dev.isFollowing,
          followersCount: dev.isFollowing ? dev.followersCount - 1 : dev.followersCount + 1
        };
      }
      return dev;
    }));
  };

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.hasLiked ? post.likes - 1 : post.likes + 1,
          hasLiked: !post.hasLiked
        };
      }
      return post;
    }));
  };

  const handleAddReaction = (postId: string, type: 'fire' | 'rocket') => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reactions: {
            ...post.reactions,
            [type]: post.reactions[type] + 1
          }
        };
      }
      return post;
    }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: 'Indie Creator (You)',
      avatar: PROFILE_AVATAR_YOU,
      date: 'Just now',
      tag: postTag,
      body: postText,
      image: attachedImage || undefined,
      likes: 0,
      shares: 0,
      reactions: { fire: 1, rocket: 1 },
      comments: []
    };

    setPosts([newPost, ...posts]);
    setPostText('');
    setAttachedImage(null);
  };

  const handleAddComment = (postId: string) => {
    const text = activeCommentTexts[postId];
    if (!text || !text.trim()) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newComment: Comment = {
          id: `comment_${Date.now()}`,
          author: 'Indie Creator (You)',
          avatar: PROFILE_AVATAR_YOU,
          text: text,
          nestedReplies: []
        };
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));

    setActiveCommentTexts(prev => ({
      ...prev,
      [postId]: ''
    }));

    setExpandedPostComments(prev => ({
      ...prev,
      [postId]: true
    }));
  };

  const handleAddReply = (postId: string, commentId: string) => {
    const replyText = activeReplyTexts[commentId];
    if (!replyText || !replyText.trim()) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              const newReply: Reply = {
                id: `reply_${Date.now()}`,
                author: 'Indie Creator (You)',
                avatar: PROFILE_AVATAR_YOU,
                text: replyText
              };
              return {
                ...comment,
                nestedReplies: [...comment.nestedReplies, newReply]
              };
            }
            return comment;
          })
        };
      }
      return post;
    }));

    setActiveReplyTexts(prev => ({
      ...prev,
      [commentId]: ''
    }));

    setExpandedReplyInputs(prev => ({
      ...prev,
      [commentId]: false
    }));
  };

  const filteredPosts = selectedTag 
    ? posts.filter(p => p.tag.toLowerCase() === selectedTag.toLowerCase())
    : posts;

  return (
    <div id="community-hub-container" className="flex flex-col lg:flex-row gap-6 animate-fade-in relative z-10 w-full">
      
      {/* SideNavBar - Column Left */}
      <aside id="community-left-sidebar" className="hidden lg:flex flex-col w-64 h-fit sticky top-28 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/45 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 shadow-sm space-y-6">
        <div>
          <h2 className="font-display font-bold text-base text-slate-800 dark:text-amber-400">Game Hub</h2>
          <p className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Developer Dashboard</p>
        </div>

        <nav className="flex flex-col gap-1.5">
          {[
            { id: 'home', label: 'Home Feed', icon: <Home size={15} /> },
            { id: 'discover', label: 'Discover Hub', icon: <Compass size={15} /> },
            { id: 'library', label: 'My Library', icon: <Gamepad2 size={15} /> },
            { id: 'community', label: 'Community Sockets', icon: <MessageSquare size={15} /> },
            { id: 'settings', label: 'Account Settings', icon: <Settings size={15} /> }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSideNav(item.id as any)}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left transition-all ${activeSideNav === item.id ? 'bg-amber-400 text-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <button 
            onClick={() => {
              if (onNavigateToSeller) onNavigateToSeller();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-400 hover:bg-amber-350 text-slate-900 rounded-xl text-xs font-bold font-display shadow-xs transition-studio"
          >
            <PlusCircle size={14} />
            Publish Asset Pack
          </button>
        </div>
      </aside>

      {/* Center Feed Column */}
      <section id="community-feed-deck" className="flex-1 max-w-4xl space-y-6">
        
        {/* Dynamic Tag filtering feedback */}
        {selectedTag && (
          <div className="flex items-center justify-between p-3.5 bg-amber-450/10 border border-amber-400/20 rounded-xl text-xs">
            <span className="text-amber-500 dark:text-amber-400 font-medium">
              Filtering by tag: <strong className="font-mono">{selectedTag}</strong>
            </span>
            <button 
              onClick={() => setSelectedTag(null)}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <X size={13} /> Clear filter
            </button>
          </div>
        )}

        {/* Share Update Post Card */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-800">
               <img 
                 referrerPolicy="no-referrer" 
                 src={PROFILE_AVATAR_YOU} 
                 alt="Your Avatar" 
                 className="w-full h-full object-cover"
               />
            </div>
            
            <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Share your latest level design, shader math or asset pack updates with the Godot community..."
                className="w-full bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 resize-none min-h-[90px] outline-none"
              />

              {/* Dynamic Attachable Image Mock Selector */}
              {attachedImage && (
                <div className="relative rounded-xl overflow-hidden border border-slate-250 dark:border-slate-800 h-44 group bg-slate-950">
                  <img src={attachedImage} alt="Attachment Preview" className="w-full h-full object-cover opacity-90" />
                  <button 
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-900/80 hover:bg-red-655 text-white shadow-md transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAttachedImage(IMAGE_SEED_MAP.forest)}
                    className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-400/10 rounded-lg transition-colors"
                    title="Attach Shader Demo Mockup"
                  >
                    <ImageIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(IMAGE_SEED_MAP.sky)}
                    className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-colors"
                    title="Attach Character Sprite Mockup"
                  >
                    <FileCode size={16} />
                  </button>

                  <select
                    value={postTag}
                    onChange={(e) => setPostTag(e.target.value)}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border-0 text-[11px] font-bold text-slate-600 dark:text-slate-350 rounded-lg focus:ring-1 focus:ring-amber-400 cursor-pointer"
                  >
                    <option value="#Godot4">#Godot4</option>
                    <option value="#Shaders">#Shaders</option>
                    <option value="#GDScriptTips">#GDScriptTips</option>
                    <option value="#PixelArt">#PixelArt</option>
                    <option value="#DevLog">#DevLog</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!postText.trim()}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-350 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-slate-900 rounded-full font-bold text-xs shadow-xs transition-studio"
                >
                  Post Update
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* FEED POSTS SYSTEM LIST */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <article 
              key={post.id} 
              className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs hover:shadow-sm hover:translate-y-[-1px] transition-all duration-300"
            >
              <div className="p-5 space-y-4">
                
                {/* Post Author Info header row */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden border border-slate-200 dark:border-slate-850">
                      <img referrerPolicy="no-referrer" src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">{post.author}</h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {post.date} • <span className="text-amber-500 font-semibold cursor-pointer hover:underline" onClick={() => setSelectedTag(post.tag)}>{post.tag}</span>
                      </p>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <Bookmark size={15} />
                  </button>
                </div>

                {/* Post content body */}
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {post.body}
                </p>

                {/* Post Image display */}
                {post.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-850 bg-slate-950 max-h-96">
                    <img src={post.image} alt="Shader showcase preview" className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-500" />
                  </div>
                )}

                {/* Interactive Action counts bar */}
                <div className="flex flex-wrap items-center gap-6 pt-3.5 border-t border-slate-150 dark:border-slate-850 text-xs text-slate-500">
                  <button 
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1.5 font-semibold transition-all ${post.hasLiked ? 'text-rose-500 scale-105' : 'hover:text-rose-500'}`}
                  >
                    <Heart size={14} className={post.hasLiked ? 'fill-rose-500' : ''} />
                    <span>{post.likes}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setExpandedPostComments(prev => ({
                        ...prev,
                        [post.id]: !prev[post.id]
                      }));
                    }}
                    className="flex items-center gap-1.5 font-semibold hover:text-sky-500 transition-colors"
                  >
                    <MessageSquare size={14} />
                    <span>{post.comments.length} Discussion</span>
                  </button>

                  <button 
                    onClick={() => alert('Post link copied to clipboard!')}
                    className="flex items-center gap-1.5 font-semibold hover:text-amber-500 transition-colors"
                  >
                    <Share2 size={14} />
                    <span>{post.shares || 8}</span>
                  </button>

                  {/* Reaction Pill Toggles */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button 
                      onClick={() => handleAddReaction(post.id, 'fire')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-350 hover:bg-amber-400 hover:text-slate-900 transition-all flex items-center gap-1"
                    >
                      🔥 {post.reactions.fire}
                    </button>
                    <button 
                      onClick={() => handleAddReaction(post.id, 'rocket')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-350 hover:bg-amber-400 hover:text-slate-900 transition-all flex items-center gap-1"
                    >
                      🚀 {post.reactions.rocket}
                    </button>
                  </div>
                </div>

                {/* THREADED COMMENTS DRAWER SECTION */}
                {expandedPostComments[post.id] && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850/60 animate-fade-in">
                    
                    {/* Submit Comment mini textbox */}
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={PROFILE_AVATAR_YOU} 
                          alt="Your Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 relative flex items-center bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2">
                        <input
                          type="text"
                          placeholder="Type an insightful feedback comment..."
                          value={activeCommentTexts[post.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveCommentTexts(prev => ({ ...prev, [post.id]: val }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          className="w-full bg-transparent border-0 ring-0 focus:ring-0 outline-none text-xs text-slate-800 dark:text-slate-155"
                        />
                        <button 
                          onClick={() => handleAddComment(post.id)}
                          className="text-amber-500 hover:text-amber-400 p-1 rounded transition-colors"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Display Nested Comments Feed */}
                    {post.comments.length > 0 ? (
                      <div className="space-y-4 pt-2">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="space-y-3">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-850 bg-slate-100">
                                <img referrerPolicy="no-referrer" src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-3 rounded-xl">
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className="font-display font-medium text-xs text-slate-800 dark:text-white">{comment.author}</span>
                                  <span className="text-[10px] text-slate-400">Just now</span>
                                </div>
                                <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">{comment.text}</p>
                                
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-450">
                                  <button 
                                    onClick={() => {
                                      setExpandedReplyInputs(prev => ({ ...prev, [comment.id]: !prev[comment.id] }));
                                    }}
                                    className="text-amber-500 dark:text-amber-400 hover:underline font-bold"
                                  >
                                    Reply
                                  </button>
                                  <span>•</span>
                                  <button className="hover:text-rose-500 transition-colors">Like</button>
                                </div>
                              </div>
                            </div>

                            {/* Nest and replies of comments */}
                            {comment.nestedReplies.map((reply) => (
                              <div key={reply.id} className="flex gap-3 ml-12">
                                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-850 bg-slate-100">
                                  <img referrerPolicy="no-referrer" src={reply.avatar} alt={reply.author} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 bg-slate-50/40 dark:bg-slate-950/30 border-l-2 border-amber-400 p-2.5 rounded-lg">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-display font-bold text-[11px] text-slate-800 dark:text-white flex items-center gap-1.5">
                                      {reply.author}
                                      {reply.isOP && <span className="bg-amber-400/20 text-amber-500 text-[8px] uppercase tracking-wider px-1 border border-amber-500/30 rounded font-black font-mono">OP</span>}
                                    </span>
                                    <span className="text-[9px] text-slate-450">Just now</span>
                                  </div>
                                  <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed">{reply.text}</p>
                                </div>
                              </div>
                            ))}

                            {/* Expand Reply Mini Form Box */}
                            {expandedReplyInputs[comment.id] && (
                              <div className="flex gap-2 items-center ml-12 animate-fade-in bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                                <input
                                  type="text"
                                  placeholder={`Reply to ${comment.author}...`}
                                  value={activeReplyTexts[comment.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActiveReplyTexts(prev => ({ ...prev, [comment.id]: val }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddReply(post.id, comment.id);
                                  }}
                                  className="w-full bg-transparent border-0 ring-0 focus:ring-0 p-1 outline-none text-xs text-slate-800 dark:text-slate-155"
                                />
                                <button
                                  onClick={() => handleAddReply(post.id, comment.id)}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-amber-400 hover:text-slate-900 rounded-lg text-[10px] font-bold"
                                >
                                  Submit
                                </button>
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-center text-slate-450 py-2">No active discussions. Add yours first!</p>
                    )}

                  </div>
                )}

              </div>
            </article>
          ))}
        </div>

      </section>

      {/* Right Column - Sideways widgets */}
      <aside id="community-right-sidebar" className="w-full lg:w-80 space-y-6">
        
        {/* Trending Tags list cards */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-500" />
            <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white">Trending Sockets</h2>
          </div>

          <div className="space-y-2">
            {[
              { tag: '#Godot4', count: '2.4k' },
              { tag: '#GDScriptTips', count: '1.8k' },
              { tag: '#PixelArt', count: '950' },
              { tag: '#DevLog', count: '842' },
              { tag: '#Shaders', count: '450' }
            ].map((trend) => (
              <button
                key={trend.tag}
                onClick={() => setSelectedTag(selectedTag === trend.tag ? null : trend.tag)}
                className={`flex justify-between items-center w-full p-2 rounded-xl text-left transition-all ${selectedTag === trend.tag ? 'bg-amber-400 text-slate-950 font-bold' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-305'}`}
              >
                <span className="text-xs font-medium">{trend.tag}</span>
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${selectedTag === trend.tag ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{trend.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Game Jam alerts */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs relative">
          <div className="h-1 bg-amber-400 w-full" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white">Active Jams</h2>
            </div>

            <div className="space-y-4">
              <div className="relative pl-3 border-l-2 border-amber-400 space-y-1">
                <p className="font-display font-bold text-xs text-slate-850 dark:text-white">Daylight Jam #42</p>
                <p className="text-[10px] text-slate-400 font-mono">Ends in: 2d 14h</p>
                
                {/* Avatars overlay group */}
                <div className="flex -space-x-1.5 pt-1">
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer1} alt="Jammer avatar" />
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer2} alt="Jammer avatar" />
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer3} alt="Jammer avatar" />
                  <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-[8px] font-bold flex items-center justify-center text-slate-500 font-mono">+12</div>
                </div>
              </div>

              <div className="relative pl-3 border-l-2 border-sky-400 space-y-1">
                <p className="font-display font-bold text-xs text-slate-850 dark:text-white">Mini-Boss Challenge</p>
                <p className="text-[10px] text-slate-400 font-mono font-semibold text-rose-500">Ends in: 4h 20m</p>
                <button 
                  onClick={() => alert('Launching mini challenge entry board! Create a unique voxel boss sprite to acquire rewards.')}
                  className="text-[10px] text-sky-500 hover:underline font-bold transition-all pt-0.5"
                >
                  View current submissions &rarr;
                </button>
              </div>
            </div>

            <button 
              onClick={() => onNavigateToMarketplace && onNavigateToMarketplace()}
              className="w-full block py-2 rounded-xl text-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/40 font-display transition-colors"
            >
              Explore Sandbox Assets
            </button>
          </div>
        </div>

        {/* Suggested connections follow card */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
          <h2 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Suggested creators</h2>
          
          <div className="space-y-4">
            {suggestedDevs.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
                    <img referrerPolicy="no-referrer" src={dev.avatar} alt={dev.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xs text-slate-800 dark:text-white">{dev.name}</h3>
                    <p className="text-[9px] text-slate-400 font-mono">{dev.specialty} • {dev.followersCount} dev</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollowDev(dev.id)}
                  className={`p-1.5 rounded-lg border transition-all ${dev.isFollowing ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'hover:bg-amber-400 hover:text-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                >
                  {dev.isFollowing ? <Check size={13} /> : <UserPlus size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>

      </aside>

    </div>
  );
}
