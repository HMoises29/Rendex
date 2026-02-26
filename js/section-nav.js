const sections = ['header', '.services-dark', '#sobre-nosotros', '.testimonials', '#contacto'];
let currentSectionIndex = 0;

const navBtn = document.createElement('div');
navBtn.className = 'scroll-nav-btn bounce';
navBtn.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>';
document.body.appendChild(navBtn);

function updateBtnState() {
    const scrollPos = window.scrollY + 100;
    let activeIdx = 0;

    sections.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element && scrollPos >= element.offsetTop) {
            activeIdx = index;
        }
    });

    currentSectionIndex = activeIdx;

    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 100);

    if (isAtBottom) {
        navBtn.classList.add('up');
    } else {
        navBtn.classList.remove('up');
    }
}

navBtn.addEventListener('click', () => {
    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 100);

    if (isAtBottom) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const nextIdx = Math.min(currentSectionIndex + 1, sections.length - 1);
        const nextSection = document.querySelector(sections[nextIdx]);
        if (nextSection) {
            const yOffset = (nextIdx === sections.length - 1) ? document.body.scrollHeight : nextSection.offsetTop;
            window.scrollTo({ top: yOffset, behavior: 'smooth' });
        }
    }
});

window.addEventListener('scroll', updateBtnState);
updateBtnState();
