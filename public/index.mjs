// public/index.mjs
const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Muhammad Teguh Marwin | Full-Stack Developer & AI Enthusiast</title>
    <meta name="description" content="Full-stack web developer building modern, fast, and scalable websites with AI integration. Explore projects, blog, and digital workspace by Muhammad Teguh Marwin." />
    <!-- Favicon -->
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%230D9489'/%3E%3Ctext x='50' y='70' font-size='50' text-anchor='middle' fill='white' font-family='Arial'%3EM%3C/text%3E%3C/svg%3E" type="image/svg+xml" />
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Socket.io -->
    <script src="/socket.io/socket.io.js"></script>
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/styles.css">
    <style>
        /* Custom styles from original HTML */
        body, a, button { cursor: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
        body, .card, .text-primary, .bg-primary { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
        #cursor-dot { width: 8px; height: 8px; background-color: #0D9489; border-radius: 50%; position: fixed; top: 0; left: 0; z-index: 100000; pointer-events: none; transform: translate(-50%, -50%); }
        .dark #cursor-dot { background-color: #2dd4bf; }
        #cursor-ring { width: 24px; height: 24px; border: 1px solid rgba(13, 148, 137, 0.5); border-radius: 50%; position: fixed; top: 0; left: 0; z-index: 99999; pointer-events: none; transition: width 0.2s ease, height 0.2s ease, border-color 0.2s ease; box-sizing: border-box; }
        .dark #cursor-ring { border-color: rgba(45, 212, 191, 0.4); }
        #cursor-ring.active { border-color: rgba(13, 148, 137, 0.2); background-color: rgba(13, 148, 137, 0.05); }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes scroll-reverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .marquee-container { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .marquee-track { display: flex; width: max-content; gap: 0.75rem; animation: scroll linear infinite; }
        .marquee-track-reverse { animation: scroll-reverse linear infinite; }
        .marquee-container:hover .marquee-track { animation-play-state: paused; }
        .ai-chat-container { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; z-index: 9999; transition: all 0.3s ease; border: 2px solid #0D9489; }
        .dark .ai-chat-container { background: #1e293b; border-color: #2dd4bf; }
        .ai-chat-header { background: #0D9489; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .ai-chat-header h3 { font-weight: bold; font-size: 16px; }
        .ai-chat-header button { background: transparent; border: none; color: white; cursor: pointer; font-size: 18px; }
        .ai-chat-messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .message { max-width: 80%; padding: 10px 15px; border-radius: 15px; word-wrap: break-word; }
        .user-message { background: #0D9489; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .ai-message { background: #f0f0f0; color: #333; align-self: flex-start; border-bottom-left-radius: 4px; }
        .dark .ai-message { background: #334155; color: #f3f4f6; }
        .ai-chat-input { display: flex; padding: 15px; gap: 10px; border-top: 1px solid #e0e0e0; }
        .dark .ai-chat-input { border-top-color: #334155; }
        .ai-chat-input textarea { flex: 1; padding: 10px; border: 1px solid #e0e0e0; border-radius: 10px; resize: none; font-size: 14px; outline: none; }
        .dark .ai-chat-input textarea { background: #1e293b; border-color: #334155; color: white; }
        .ai-chat-input textarea:focus { border-color: #0D9489; }
        .ai-chat-input button { background: #0D9489; color: white; border: none; border-radius: 10px; padding: 10px 15px; cursor: pointer; transition: background 0.2s; }
        .ai-chat-input button:hover { background: #0f766e; }
        .ai-chat-toggle { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #0D9489; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(13, 148, 137, 0.4); z-index: 9998; transition: all 0.3s; border: 2px solid white; }
        .dark .ai-chat-toggle { border-color: #1e293b; }
        .ai-chat-toggle:hover { transform: scale(1.1); }
        .ai-chat-toggle svg { width: 30px; height: 30px; fill: white; }
        .ai-chat-container.hidden { transform: translateY(20px); opacity: 0; pointer-events: none; }
        .typing-indicator { display: flex; gap: 5px; padding: 10px 15px; background: #f0f0f0; border-radius: 15px; border-bottom-left-radius: 4px; width: fit-content; }
        .dark .typing-indicator { background: #334155; }
        .typing-dot { width: 8px; height: 8px; background: #888; border-radius: 50%; animation: typing 1.4s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.6; } 30% { transform: translateY(-10px); opacity: 1; } }
        .tech-item { user-select: none; will-change: transform, left, top; box-shadow: 0 4px 15px -1px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03); border: 1px solid rgba(255, 255, 255, 1); }
        .dark .tech-item span.text-sky-600 { color: #7dd3fc !important; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 10px 20px; border-radius: 5px; z-index: 10000; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modal-content { background: white; padding: 20px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
        .dark .modal-content { background: #1e293b; color: white; }
        .profile-menu { position: absolute; top: 60px; right: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 10px; z-index: 9999; }
        .dark .profile-menu { background: #1e293b; border: 1px solid #334155; }
        .profile-menu button { display: block; width: 100%; text-align: left; padding: 8px 16px; border-radius: 5px; }
        .profile-menu button:hover { background: #f0f0f0; }
        .dark .profile-menu button:hover { background: #334155; }
    </style>
</head>
<body class="bg-[#F4F7FE] dark:bg-[#0F172A] text-gray-800 dark:text-gray-100 transition-colors duration-300 min-h-screen overflow-x-hidden relative">
    <!-- Custom Cursor -->
    <div id="cursor-dot"></div>
    <div id="cursor-ring"></div>
    
    <!-- Main Layout -->
    <div class="flex flex-col md:flex-row min-h-screen relative z-10">
        <!-- Desktop Sidebar -->
        <nav class="hidden md:flex md:fixed md:top-0 md:left-0 md:h-screen md:w-[80px] bg-white dark:bg-[#111827] border-r border-gray-100 dark:border-gray-800 z-50 flex-col items-center py-8 shadow-none justify-between">
            <div class="flex flex-col items-center gap-8 w-full">
                <div class="mb-2 interactive">
                    <a href="#" class="block group relative w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">M</a>
                </div>
                <div class="flex flex-col gap-6 items-center w-full">
                    <a href="#home" class="interactive p-3 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 hover:scale-110 relative group" title="Home">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clip-rule="evenodd"></path></svg>
                        <span class="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-gray-700 after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-white dark:after:border-r-gray-800">Home</span>
                    </a>
                    <a href="#about" class="interactive p-3 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 hover:scale-110 relative group" title="About">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd"></path></svg>
                        <span class="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-gray-700 after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-white dark:after:border-r-gray-800">About</span>
                    </a>
                    <a href="#projects" class="interactive p-3 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 hover:scale-110 relative group" title="Projects">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z"></path></svg>
                        <span class="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-gray-700 after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-white dark:after:border-r-gray-800">Projects</span>
                    </a>
                    <a href="#articles" class="interactive p-3 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 hover:scale-110 relative group" title="Articles">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clip-rule="evenodd"></path><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z"></path></svg>
                        <span class="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-gray-700 after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-white dark:after:border-r-gray-800">Articles</span>
                    </a>
                    <a href="#contact" class="interactive p-3 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 hover:scale-110 relative group" title="Contact">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"></path><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"></path></svg>
                        <span class="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-gray-700 after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-white dark:after:border-r-gray-800">Contact</span>
                    </a>
                </div>
            </div>
            <div class="flex flex-col items-center gap-4 pb-4">
                <div class="relative">
                    <button id="profile-button" class="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold overflow-hidden">
                        ${state.user?.profilePicture ? 
                          `<img src="${state.user.profilePicture}" class="w-full h-full object-cover">` : 
                          (state.user?.username?.charAt(0).toUpperCase() || 'G')
                        }
                    </button>
                    <div id="profile-menu" class="profile-menu hidden">
                        ${state.user ? `
                            <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                <p class="font-bold">${state.user.username}</p>
                                <p class="text-sm text-gray-500">${state.user.email}</p>
                            </div>
                            <button onclick="showProfileModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Profile</button>
                            <button onclick="logout()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">Logout</button>
                        ` : `
                            <button onclick="showLoginModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Login</button>
                            <button onclick="showRegisterModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Register</button>
                        `}
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Mobile Header -->
        <header class="md:hidden fixed top-4 left-4 right-4 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg rounded-2xl px-4 py-3 flex items-center justify-between transition-all duration-300">
            <div class="flex items-center gap-3">
                <a href="#" class="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 bg-primary-600 flex items-center justify-center text-white font-bold text-lg">M</a>
                <span class="font-bold text-lg text-gray-900 dark:text-white tracking-tight">Teguh.</span>
            </div>
            <div class="flex items-center gap-2">
                <button id="mobile-theme-toggle" class="w-10 h-10 rounded-full text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 bg-gray-100/50 dark:bg-slate-800/50 active:scale-95 transition-all flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 hidden dark:block"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 block dark:hidden"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"></path></svg>
                </button>
                <button onclick="window.toggleAIChat()" class="w-10 h-10 rounded-full text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 bg-gray-100/50 dark:bg-slate-800/50 active:scale-95 transition-all relative flex items-center justify-center">
                    <span class="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse border border-white dark:border-slate-800"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.328A11.202 11.202 0 019 20.25c-2.288 0-4.4-.711-6.093-1.905.001.073.003.145.003.218 0 4.556 4.03 8.25 9 8.25 4.97 0 9-3.694 9-8.25 0-4.294-3.59-7.826-8.25-8.25"></path></svg>
                </button>
                <button id="mobile-profile-button" class="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold overflow-hidden">
                    ${state.user?.profilePicture ? 
                      `<img src="${state.user.profilePicture}" class="w-full h-full object-cover">` : 
                      (state.user?.username?.charAt(0).toUpperCase() || 'G')
                    }
                </button>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="flex-1 w-full transition-all duration-300 pt-20 md:pt-0">
            <!-- Desktop Header -->
            <header id="main-header" class="hidden md:flex sticky top-0 z-40 px-6 md:pl-[120px] md:pr-10 py-4 flex-row justify-between items-center gap-4 transition-all duration-300 border-b border-transparent bg-[#F4F7FE]/0 dark:bg-[#0F172A]/0 backdrop-blur-none">
                <div class="flex justify-start md:justify-center md:absolute md:left-1/2 md:-translate-x-1/2 w-auto mt-0">
                    <div class="flex items-center text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <span class="hover:text-[#0D9489] transition-colors cursor-pointer">Home</span>
                        <span class="mx-3 text-[#0D9489]/50">/</span>
                        <span class="text-gray-600 dark:text-gray-300 font-bold">Dashboard</span>
                    </div>
                </div>
                <div class="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div class="flex items-center gap-3">
                        <button id="theme-toggle" class="interactive p-2 rounded-full text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-white dark:bg-[#1e293b] shadow-md ring-1 ring-gray-200 dark:ring-gray-700 transition-all active:scale-95">
                            <svg id="theme-toggle-light-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 hidden dark:block"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"></path></svg>
                            <svg id="theme-toggle-dark-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 block dark:hidden"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"></path></svg>
                        </button>
                        <button onclick="window.toggleAIChat()" class="interactive p-2 rounded-full text-gray-400 hover:text-primary-600 bg-white dark:bg-[#1e293b] shadow-md ring-1 ring-gray-200 dark:ring-gray-700 transition-all active:scale-95 relative">
                            <span class="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full border border-white animate-pulse"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"></path></svg>
                        </button>
                    </div>
                </div>
            </header>
            
            <!-- Dashboard Content -->
            <div id="app" class="px-6 md:pl-[120px] md:pr-10 pb-10">
                <!-- Content will be populated by JavaScript -->
                <div class="flex justify-center items-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </div>
            
            <!-- Footer -->
            <footer class="mt-20 border-t border-gray-200 dark:border-gray-800">
                <div class="max-w-7xl mx-auto pt-8 pb-10">
                    <div class="text-center">
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            © 2026 <span class="font-semibold text-gray-700 dark:text-gray-300">Muhammad Teguh Marwin</span>. All rights reserved.
                        </p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            Built with <span class="inline-block animate-heartbeat text-red-500">❤️</span> in Kudus, ID
                        </p>
                        <div class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                            <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="text-xs font-mono text-gray-600 dark:text-gray-300">
                                <span>Waktu berjalan:</span>
                                <span id="running-time" class="font-bold text-primary-600 dark:text-primary-400">0d 0h 0m 0s</span>
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    </div>
    
    <!-- AI Chat Components -->
    <div class="ai-chat-toggle" id="aiChatToggle" onclick="window.toggleAIChat()">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2.5 21.5l4.5-.85c1.47.85 3.18 1.35 5 1.35 5.52 0 10-4.48 10-10S17.52 2 12 2z"/><circle cx="8" cy="12" r="1.5" fill="white"/><circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="16" cy="12" r="1.5" fill="white"/></svg>
    </div>
    
    <div class="ai-chat-container hidden" id="aiChatContainer">
        <div class="ai-chat-header">
            <h3>🤖 TEGUH AI - Assistant</h3>
            <button onclick="window.toggleAIChat()">✕</button>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages">
            <div class="message ai-message">
                Halo! Saya TEGUH AI, asisten virtual Muhammad Teguh Marwin. Ada yang bisa saya bantu?
            </div>
        </div>
        <div class="ai-chat-input">
            <textarea id="aiChatInput" placeholder="Tulis pesan..." rows="1"></textarea>
            <button onclick="window.sendAIChat()">Kirim</button>
        </div>
    </div>
    
    <!-- Modal Container -->
    <div id="modal-container" class="hidden"></div>
    
    <!-- Main JavaScript Module -->
    <script type="module" src="/index.mjs"></script>
</body>
</html>`;

// =====================================================
// FRONTEND APPLICATION LOGIC
// =====================================================

// State management
const state = {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    projects: [],
    articles: [],
    chatMessages: [],
    chatSessionId: localStorage.getItem('chatSessionId') || generateSessionId(),
    isLoading: false,
    socket: null
};

// Utility functions
function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Modal functions
function showModal(title, content) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <h2 class="text-2xl font-bold mb-4">${title}</h2>
                ${content}
                <div class="flex justify-end mt-4">
                    <button onclick="closeModal()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Close</button>
                </div>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

window.closeModal = closeModal;

// Login modal
window.showLoginModal = function() {
    showModal('Login', `
        <form id="loginForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Email</label>
                <input type="email" id="loginEmail" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Password</label>
                <input type="password" id="loginPassword" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
            </div>
            <button type="submit" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Login</button>
        </form>
    `);
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const data = await api.login(email, password);
            showToast('Login successful!', 'success');
            closeModal();
            updateUserInterface();
            renderDashboard();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
};

// Register modal
window.showRegisterModal = function() {
    showModal('Register', `
        <form id="registerForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Username</label>
                <input type="text" id="registerUsername" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Email</label>
                <input type="email" id="registerEmail" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Password</label>
                <input type="password" id="registerPassword" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
            </div>
            <button type="submit" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Register</button>
        </form>
    `);
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            await api.register({ username, email, password });
            showToast('Registration successful! Please login.', 'success');
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
};

// Profile modal
window.showProfileModal = async function() {
    try {
        const profile = await api.getProfile();
        
        showModal('Profile', `
            <div class="space-y-4">
                <div class="flex justify-center">
                    <img src="${profile.profilePicture || 'https://ui-avatars.com/api/?name=' + profile.username}" class="w-24 h-24 rounded-full object-cover">
                </div>
                <form id="profileForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Username</label>
                        <input type="text" id="profileUsername" value="${profile.username}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Bio</label>
                        <textarea id="profileBio" rows="3" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">${profile.bio || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Profile Picture</label>
                        <input type="file" id="profilePicture" accept="image/*" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
                    </div>
                    <button type="submit" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Update Profile</button>
                </form>
            </div>
        `);
        
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('profileUsername').value;
            const bio = document.getElementById('profileBio').value;
            const file = document.getElementById('profilePicture').files[0];
            
            try {
                await api.updateProfile({ username, bio }, file);
                showToast('Profile updated!', 'success');
                closeModal();
                updateUserInterface();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Logout
window.logout = function() {
    api.logout();
};

// Update UI based on auth state
function updateUserInterface() {
    const profileButtons = document.querySelectorAll('#profile-button, #mobile-profile-button');
    profileButtons.forEach(btn => {
        if (btn) {
            btn.innerHTML = state.user?.profilePicture ? 
                `<img src="${state.user.profilePicture}" class="w-full h-full object-cover">` : 
                (state.user?.username?.charAt(0).toUpperCase() || 'G');
        }
    });
    
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
        if (state.user) {
            profileMenu.innerHTML = `
                <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p class="font-bold">${state.user.username}</p>
                    <p class="text-sm text-gray-500">${state.user.email}</p>
                </div>
                <button onclick="showProfileModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Profile</button>
                <button onclick="logout()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">Logout</button>
            `;
        } else {
            profileMenu.innerHTML = `
                <button onclick="showLoginModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Login</button>
                <button onclick="showRegisterModal()" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Register</button>
            `;
        }
    }
}

// Profile menu toggle
document.addEventListener('click', (e) => {
    const profileMenu = document.getElementById('profile-menu');
    const profileButton = document.getElementById('profile-button');
    
    if (profileButton && profileButton.contains(e.target)) {
        profileMenu.classList.toggle('hidden');
    } else if (profileMenu && !profileMenu.contains(e.target)) {
        profileMenu.classList.add('hidden');
    }
});

// API Service
const api = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }
        
        try {
            const response = await fetch(`/api${endpoint}`, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message, 'error');
            throw error;
        }
    },
    
    // Auth
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    logout() {
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    },
    
    // Projects
    async getProjects(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await this.request(`/projects${query ? '?' + query : ''}`);
        state.projects = data.projects;
        return data;
    },
    
    async getProject(id) {
        return this.request(`/projects/${id}`);
    },
    
    async likeProject(id) {
        return this.request(`/projects/${id}/like`, {
            method: 'POST'
        });
    },
    
    // Articles
    async getArticles(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await this.request(`/articles${query ? '?' + query : ''}`);
        state.articles = data.articles;
        return data;
    },
    
    async getArticle(slug) {
        return this.request(`/articles/${slug}`);
    },
    
    async commentOnArticle(articleId, content) {
        return this.request(`/articles/${articleId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    },
    
    // Contact
    async sendContact(data) {
        return this.request('/contact', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Chat
    async sendChat(message) {
        return this.request('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                sessionId: state.chatSessionId
            })
        });
    },
    
    async getChatHistory() {
        return this.request(`/chat/history/${state.chatSessionId}`);
    },
    
    // User profile
    async getProfile() {
        const data = await this.request('/user/profile');
        state.user = data;
        localStorage.setItem('user', JSON.stringify(data));
        return data;
    },
    
    async updateProfile(data, file) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        if (file) {
            formData.append('profilePicture', file);
        }
        
        const result = await this.request('/user/profile', {
            method: 'PUT',
            headers: {},
            body: formData
        });
        
        state.user = result;
        localStorage.setItem('user', JSON.stringify(result));
        return result;
    }
};

// Theme management
function initTheme() {
    if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    initTheme();
}

// Custom cursor
function initCursor() {
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorDot) {
            cursorDot.style.left = `${mouseX}px`;
            cursorDot.style.top = `${mouseY}px`;
        }
    });
    
    function animateRing() {
        if (!cursorRing) return;
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        cursorRing.style.left = `${ringX}px`;
        cursorRing.style.top = `${ringY}px`;
        requestAnimationFrame(animateRing);
    }
    animateRing();
    
    document.querySelectorAll('a, button, .interactive').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (cursorRing) cursorRing.classList.add('active');
        });
        el.addEventListener('mouseleave', () => {
            if (cursorRing) cursorRing.classList.remove('active');
        });
    });
}

// Live clock
function initClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const clockEl = document.getElementById('live-clock');
        if (clockEl) clockEl.innerText = timeString + ' GMT+7';
    }
    setInterval(updateClock, 1000);
    updateClock();
}

// Running time counter
function initRunningTime() {
    const launchDate = new Date(2023, 1, 4, 0, 0, 0);
    
    function updateRunningTime() {
        const now = new Date();
        const diff = now - launchDate;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const displaySeconds = seconds % 60;
        const displayMinutes = minutes % 60;
        const displayHours = hours % 24;
        const runningTimeEl = document.getElementById('running-time');
        if (runningTimeEl) {
            runningTimeEl.textContent = `${days}d ${displayHours}h ${displayMinutes}m ${displaySeconds}s`;
        }
    }
    updateRunningTime();
    setInterval(updateRunningTime, 1000);
}

// AI Chat functionality
window.toggleAIChat = function() {
    const container = document.getElementById('aiChatContainer');
    container.classList.toggle('hidden');
};

window.sendAIChat = async function() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message || state.isLoading) return;
    
    input.value = '';
    addChatMessage('user', message);
    showTypingIndicator();
    
    state.isLoading = true;
    
    try {
        const response = await api.sendChat(message);
        removeTypingIndicator();
        addChatMessage('ai', response.message);
        
        // Save session ID
        if (response.sessionId) {
            state.chatSessionId = response.sessionId;
            localStorage.setItem('chatSessionId', response.sessionId);
        }
    } catch (error) {
        removeTypingIndicator();
        addChatMessage('ai', 'Maaf, terjadi kesalahan. Silakan coba lagi.');
    }
    
    state.isLoading = false;
};

function addChatMessage(role, content) {
    const container = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.textContent = content;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Tech stack items
const techItems = [
    { name: 'React', color: '#61DAFB', icon: '⚛️' },
    { name: 'Next.js', color: '#000000', icon: '▲' },
    { name: 'TypeScript', color: '#3178C6', icon: 'TS' },
    { name: 'Node.js', color: '#339933', icon: '🟢' },
    { name: 'Tailwind CSS', color: '#06B6D4', icon: '🌊' },
    { name: 'GraphQL', color: '#E10098', icon: '◉' },
    { name: 'Docker', color: '#2496ED', icon: '🐳' },
    { name: 'Git', color: '#F05032', icon: '📦' },
    { name: 'Python', color: '#3776AB', icon: '🐍' },
    { name: 'MongoDB', color: '#47A248', icon: '🍃' },
    { name: 'PostgreSQL', color: '#4169E1', icon: '🐘' },
    { name: 'Redis', color: '#DC382D', icon: '📀' },
    { name: 'Express', color: '#000000', icon: '🚂' },
    { name: 'Vue.js', color: '#4FC08D', icon: '🟢' },
    { name: 'Angular', color: '#DD0031', icon: '🅰️' }
];

function populateTechItems() {
    const container = document.getElementById('tech-container');
    if (!container) return;
    
    container.innerHTML = '';
    techItems.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'tech-item bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-full px-4 py-2 shadow-md flex items-center gap-2 cursor-grab active:cursor-grabbing absolute hover:z-50 transition-shadow duration-200';
        div.style.left = `${Math.random() * (container.offsetWidth - 120)}px`;
        div.style.top = `${Math.random() * (container.offsetHeight - 40)}px`;
        div.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        div.innerHTML = `
            <span class="text-sky-600" style="color: ${item.color}">${item.icon}</span>
            <span class="text-slate-600 dark:text-slate-200 font-medium text-sm">${item.name}</span>
        `;
        container.appendChild(div);
    });
}

// Render dashboard
async function renderDashboard() {
    const app = document.getElementById('app');
    
    try {
        const [projectsData, articlesData] = await Promise.all([
            api.getProjects({ limit: 6 }),
            api.getArticles({ limit: 4 })
        ]);
        
        app.innerHTML = `
            <!-- Welcome Card -->
            <div id="home" class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto mt-4 scroll-mt-32">
                <!-- Left Column -->
                <div class="col-span-1 md:col-span-2 flex flex-col justify-end self-end gap-4">
                    <div class="flex items-center justify-between pb-2 px-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">
                        <div class="flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Teguh Workspace</span>
                        </div>
                        <div class="hidden sm:flex items-center gap-4">
                            <span>KUDUS, ID</span>
                            <span>•</span>
                            <span id="live-clock">14:02 GMT+7</span>
                            <span>•</span>
                            <span id="live-temp">28°C</span>
                        </div>
                    </div>
                    
                    <div class="card bg-white dark:bg-[#1e293b] rounded-[28px] p-6 md:p-8 shadow-soft dark:shadow-soft-dark relative overflow-hidden transition-all duration-300 group flex flex-col justify-center min-h-[400px]">
                        <div class="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
                        <div class="relative z-10 flex flex-col md:flex-row justify-between items-center h-full gap-4">
                            <div class="flex-1 w-full text-left md:pl-6">
                                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 mb-4 w-fit shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <div class="relative flex h-2.5 w-2.5">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                                    </div>
                                    <span class="text-xs font-bold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]">Status : Online</span>
                                </div>
                                <h1 class="text-3xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2 pb-1">
                                    Hi, I'm Teguh
                                    <span class="inline-block animate-wave origin-[70%_70%]">👋</span>
                                </h1>
                                <p class="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-8 mb-8">
                                    I build intelligent web systems, AI tools, and automation solutions. Transforming complex ideas into clean, functional digital realities.
                                </p>
                                <div class="flex flex-row gap-3 mt-1 w-full md:w-auto">
                                    <a href="#projects" class="interactive flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-full bg-[#0D9489] hover:bg-[#0f766e] text-white font-medium transition-transform hover:-translate-y-0.5 text-xs md:text-sm shadow-md shadow-teal-500/20 flex items-center whitespace-nowrap">View Projects</a>
                                    <a href="#" onclick="window.toggleAIChat()" class="interactive flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-full bg-white border border-gray-200 hover:border-[#0D9489] dark:bg-gray-800 dark:border-gray-700 dark:hover:border-teal-700 text-gray-700 dark:text-gray-300 hover:text-[#0D9489] dark:hover:text-teal-400 font-medium transition-all hover:-translate-y-0.5 text-xs md:text-sm flex items-center gap-2 whitespace-nowrap">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clip-rule="evenodd"/></svg>
                                        <span>AI Chat</span>
                                    </a>
                                </div>
                            </div>
                            <div class="hidden md:flex justify-end items-center w-56 h-auto relative shrink-0 -mr-2">
                                <div class="animate-float relative w-full flex justify-center items-center">
                                    <svg width="240" height="200" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-2xl">
                                        <g transform="translate(220, 20)">
                                            <animateTransform attributeName="transform" type="translate" values="220 20; 220 15; 220 20" dur="3s" repeatCount="indefinite"/>
                                            <circle cx="0" cy="0" r="4" fill="#61DAFB"/>
                                            <ellipse cx="0" cy="0" rx="20" ry="8" stroke="#61DAFB" stroke-width="1.5" transform="rotate(0)"/>
                                            <ellipse cx="0" cy="0" rx="20" ry="8" stroke="#61DAFB" stroke-width="1.5" transform="rotate(60)"/>
                                            <ellipse cx="0" cy="0" rx="20" ry="8" stroke="#61DAFB" stroke-width="1.5" transform="rotate(120)"/>
                                        </g>
                                        <rect x="40" y="40" width="200" height="140" rx="12" fill="#1e293b" stroke="#334155" stroke-width="2"/>
                                        <rect x="40" y="40" width="200" height="24" rx="12" fill="#0f172a"/>
                                        <circle cx="60" cy="52" r="4" fill="#ef4444"/>
                                        <circle cx="76" cy="52" r="4" fill="#fbbf24"/>
                                        <circle cx="92" cy="52" r="4" fill="#22c55e"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Panel -->
                <div class="col-span-1 flex flex-col gap-4 mt-4">
                    <div class="interactive bg-white dark:bg-[#1e293b] rounded-3xl p-5 shadow-soft dark:shadow-soft-dark border border-gray-50 dark:border-gray-800/50 transition-transform">
                        <div class="flex justify-between items-start mb-2">
                            <div class="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 18"/></svg>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 tracking-wide uppercase">Active</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 dark:text-gray-200">AI-Powered Web Apps</h3>
                        <p class="text-sm text-gray-500 mt-1">Integrating LLMs into frontend workflows.</p>
                    </div>
                    
                    <div class="interactive bg-white dark:bg-[#1e293b] rounded-3xl p-5 shadow-soft dark:shadow-soft-dark border border-gray-50 dark:border-gray-800/50 transition-transform">
                        <div class="flex justify-between items-start mb-2">
                            <div class="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-sky-600 dark:text-sky-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 tracking-wide uppercase">Active</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Automation Systems</h3>
                        <p class="text-sm text-gray-500 mt-1">Connecting APIs and background tasks.</p>
                    </div>
                    
                    <div class="interactive bg-white dark:bg-[#1e293b] rounded-3xl p-5 shadow-soft dark:shadow-soft-dark border border-gray-50 dark:border-gray-800/50 transition-transform">
                        <div class="flex justify-between items-start mb-2">
                            <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 5.472m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 tracking-wide uppercase">Available</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Collaboration</h3>
                        <p class="text-sm text-gray-500 mt-1">Open to technical partnership roles.</p>
                    </div>
                </div>
            </div>
            
            <!-- Tech Stack -->
            <div class="max-w-7xl mx-auto mt-12 mb-12">
                <div class="backdrop-blur-lg border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 bg-white dark:bg-slate-900/40 transition-colors duration-300">
                    <h2 class="text-gray-900 dark:text-white text-2xl font-bold mb-3">
                        What I work with
                    </h2>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">
                        These are the tools and technologies I use to build things.
                    </p>
                    <div id="tech-container" class="hidden md:block relative w-full h-[280px] border border-dashed border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-[#f8fafc]/50 dark:bg-slate-950/50 transition-colors duration-300 select-none"></div>
                </div>
            </div>
            
            <!-- About Section -->
            <section id="about" class="max-w-7xl mx-auto mt-12 mb-12 scroll-mt-32">
                <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
                    <div class="bg-white dark:bg-[#1e293b] rounded-3xl p-8 shadow-soft dark:shadow-soft-dark border border-gray-100 dark:border-gray-800 transition-all duration-300">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Who Am I?</h2>
                        <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                            <p>I'm a <span class="text-primary-600 dark:text-primary-400 font-semibold">full-stack developer</span> and <span class="text-primary-600 dark:text-primary-400 font-semibold">AI enthusiast</span> based in Kudus, Indonesia. I specialize in building intelligent web systems that solve real-world problems.</p>
                            <p>My journey started with curiosity about how things work on the web. Now, I combine modern frameworks like <strong class="text-gray-800 dark:text-gray-200">Next.js</strong> and <strong class="text-gray-800 dark:text-gray-200">React</strong> with AI technologies to create tools that automate workflows and enhance productivity.</p>
                            <p>When I'm not coding, you'll find me exploring new tech stacks, or listening to music while brainstorming the next big idea.</p>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 shadow-soft dark:shadow-soft-dark border border-gray-200 dark:border-gray-700 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute -right-10 -top-10 w-40 h-40 bg-primary-400/20 dark:bg-primary-500/15 rounded-full blur-3xl"></div>
                        <div class="relative z-10">
                            <div class="flex items-center gap-3 mb-4">
                                <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Lofi Beats</h3>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">24/7 Live Radio</p>
                                </div>
                            </div>
                            <div class="bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                                <div class="relative aspect-video">
                                    <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=0&mute=0&controls=1&loop=1&playlist=jfKfPfyJRdk" title="Lofi Girl" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                                </div>
                                <div class="p-4">
                                    <h4 class="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">lofi hip hop radio 📚 - beats to relax/study to</h4>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Lofi Girl</p>
                                    <div class="flex items-center justify-between">
                                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-medium text-red-700 dark:text-red-400">
                                            <span class="relative flex h-2 w-2">
                                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            LIVE
                                        </div>
                                        <a href="https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow" target="_blank" class="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Open YouTube →</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- Projects Section -->
            <section id="projects" class="max-w-7xl mx-auto mt-12 mb-12 scroll-mt-32">
                <div class="flex items-center gap-4 mb-8">
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Selected Projects</h2>
                    <div class="h-[1px] bg-gray-200 dark:bg-gray-700 flex-1"></div>
                    <div class="flex-shrink-0 relative z-[5]">
                        <a href="#" class="inline-block text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors pointer-events-auto">View All -></a>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    ${projectsData.projects.length > 0 ? projectsData.projects.map(project => `
                        <div class="bg-white dark:bg-[#1e293b] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                            ${project.image ? `<img src="${project.image}" alt="${project.title}" class="w-full h-48 object-cover">` : ''}
                            <div class="p-6">
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${project.title}</h3>
                                <p class="text-gray-600 dark:text-gray-400 mb-4">${project.description}</p>
                                <div class="flex flex-wrap gap-2 mb-4">
                                    ${project.technologies.slice(0, 3).map(tech => `
                                        <span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded-full">${tech}</span>
                                    `).join('')}
                                </div>
                                <div class="flex justify-between items-center">
                                    <a href="${project.githubUrl || '#'}" target="_blank" class="text-primary-600 hover:text-primary-700 text-sm font-medium">View Project →</a>
                                    <button onclick="likeProject('${project.id}')" class="flex items-center gap-1 text-gray-500 hover:text-red-500">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                        <span>${project.likes || 0}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<div class="md:col-span-3 text-center py-10 text-gray-500">No projects found.</div>'}
                </div>
            </section>
            
            <!-- Contact Section -->
            <section id="contact" class="max-w-7xl mx-auto mt-12 mb-12 scroll-mt-32">
                <div class="bg-white dark:bg-[#1e293b] rounded-3xl p-8 shadow-soft dark:shadow-soft-dark">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Get In Touch</h2>
                    <form id="contactForm" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                <input type="text" name="name" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                <input type="email" name="email" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                            <input type="text" name="subject" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                            <textarea name="message" rows="5" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"></textarea>
                        </div>
                        <button type="submit" class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                            Send Message
                        </button>
                    </form>
                </div>
            </section>
        `;
        
        // Initialize tech items
        populateTechItems();
        
        // Initialize clock
        initClock();
        
        // Setup contact form
        document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                await api.sendContact(data);
                showToast('Message sent successfully!', 'success');
                e.target.reset();
            } catch (error) {
                showToast('Failed to send message', 'error');
            }
        });
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        app.innerHTML = '<div class="text-center text-red-500 py-10">Failed to load content. Please refresh the page.</div>';
    }
}

// Socket.io connection
function initSocket() {
    state.socket = io();
    
    state.socket.on('connect', () => {
        console.log('Socket connected');
        state.socket.emit('join', { room: 'general' });
    });
    
    state.socket.on('chat response', (data) => {
        if (data.error) {
            showToast(data.error, 'error');
        } else {
            addChatMessage('ai', data.response);
        }
    });
    
    state.socket.on('typing', (data) => {
        // Handle typing indicator
        console.log(`${data.user} is typing: ${data.isTyping}`);
    });
}

// Like project function
window.likeProject = async (projectId) => {
    if (!state.user) {
        showToast('Please login to like projects', 'warning');
        showLoginModal();
        return;
    }
    
    try {
        const data = await api.likeProject(projectId);
        showToast('Project liked!', 'success');
        // Update UI
        const likeBtn = document.querySelector(`[onclick="likeProject('${projectId}')"] span`);
        if (likeBtn) {
            likeBtn.textContent = data.likes;
        }
    } catch (error) {
        showToast('Failed to like project', 'error');
    }
};

// Enter key for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.id === 'aiChatInput') {
        e.preventDefault();
        window.sendAIChat();
    }
});

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set HTML content
    document.documentElement.innerHTML = html;
    
    // Initialize features
    initTheme();
    initCursor();
    initRunningTime();
    initSocket();
    
    // Setup theme toggle buttons
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('mobile-theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Render dashboard
    renderDashboard();
    
    // Load chat history if exists
    if (state.chatSessionId) {
        api.getChatHistory().then(data => {
            if (data.messages?.length) {
                const container = document.getElementById('aiChatMessages');
                container.innerHTML = '';
                data.messages.forEach(msg => {
                    addChatMessage(msg.role, msg.content);
                });
            }
        }).catch(console.error);
    }
    
    // Update user interface
    updateUserInterface();
});

export default { state, api };
