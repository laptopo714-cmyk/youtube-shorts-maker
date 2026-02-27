const processBtn = document.getElementById('process-btn');
const urlInput = document.getElementById('youtube-url');
const minDurInput = document.getElementById('min-duration');
const maxDurInput = document.getElementById('max-duration');
const resSelect = document.getElementById('resolution');

const setupSection = document.getElementById('setup-section');
const processSection = document.getElementById('processing-section');
const gallerySection = document.getElementById('gallery-section');
const clipsGrid = document.getElementById('clips-grid');
const downloadAllBtn = document.getElementById('download-all-btn');

// Show Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconHtml = type === 'error' 
        ? '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
        : '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    
    toast.innerHTML = `
        ${iconHtml}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

processBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const minDur = parseInt(minDurInput.value);
    const maxDur = parseInt(maxDurInput.value);
    const resolution = resSelect.value;

    if (!url) {
        showToast('Please enter a valid YouTube URL', 'error');
        urlInput.focus();
        return;
    }

    if (minDur >= maxDur) {
        showToast('Min duration must be less than Max duration', 'error');
        return;
    }

    // Toggle View
    setupSection.classList.add('hidden');
    processSection.classList.remove('hidden');
    processSection.classList.add('flex');

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, minDur, maxDur, resolution })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Unknown processing error');
        }

        renderClips(data);
        showToast('Clips generated successfully!', 'success');
        
    } catch (error) {
        console.error('Frontend Error:', error);
        showToast(error.message, 'error');
        // Reset View
        processSection.classList.add('hidden');
        processSection.classList.remove('flex');
        setupSection.classList.remove('hidden');
    }
});

function renderClips(data) {
    const { sessionId, clips } = data;
    clipsGrid.innerHTML = '';

    clips.forEach((clip, index) => {
        const card = document.createElement('div');
        card.className = 'glass-panel flex flex-col rounded-2xl overflow-hidden hover:border-brand/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)] anim-fade-up-stagger';
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Calculate aspect ratio padding for modern video container
        const ratioClass = resSelect.value === '9:16' ? 'aspect-[9/16]' : (resSelect.value === '1:1' ? 'aspect-square' : 'aspect-video');

        card.innerHTML = `
            <div class="relative ${ratioClass} w-full overflow-hidden bg-dark-surface/50">
                <video src="${clip.url}" class="w-full h-full object-contain" controls preload="metadata"></video>
                <div class="absolute top-4 right-4 bg-brand px-3 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-lg">
                    ${Math.round(clip.duration)}s
                </div>
            </div>
            
            <div class="p-5 flex flex-col gap-4">
                <div class="flex flex-col">
                    <h4 class="font-bold text-lg text-white font-display truncate">Viral Clip #${index + 1}</h4>
                    <span class="text-xs text-brand font-medium">Ready to post 🚀</span>
                </div>
                
                <a href="${clip.url}" download="clip_${index + 1}.mp4" 
                   class="w-full flex items-center justify-center gap-2 h-12 bg-white/5 border border-white/10 hover:bg-brand hover:border-brand text-white rounded-xl text-sm font-bold transition-colors group cursor-pointer">
                    <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                </a>
            </div>
        `;
        clipsGrid.appendChild(card);
    });

    downloadAllBtn.onclick = () => {
        window.location.href = `/api/download-all/${sessionId}`;
    };

    // Swap Sections
    processSection.classList.add('hidden');
    processSection.classList.remove('flex');
    gallerySection.classList.remove('hidden');
}
