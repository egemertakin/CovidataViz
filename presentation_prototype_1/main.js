document.addEventListener('DOMContentLoaded', function() {
    // Get all slides
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    let isAnimating = false;
    let wheelEnabled = true;
    
    // Initialize - show first slide
    slides[0].classList.add('active');
    
    // Function to change slide
    function goToSlide(index) {
      if (isAnimating) return;
      if (index < 0) index = 0; // Prevent going before first slide
      if (index >= slides.length) index = slides.length - 1; // Prevent going past last slide
      
      isAnimating = true;
      
      // Hide current slide
      slides[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      
      // Show new slide
      currentSlide = index;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
      
      // Handle iframe loading if applicable
      const currentIframe = slides[currentSlide].querySelector('iframe');
      if (currentIframe) {
        // Ensure iframe is loaded and refresh if needed
        if (!currentIframe.dataset.loaded) {
          // Refresh iframe to ensure visualization loads properly
          const src = currentIframe.src;
          currentIframe.src = src;
          currentIframe.dataset.loaded = 'true';
        }
      }
      
      // Animation timing for enhanced visual elements
      if (slides[currentSlide].id === 'world-insight') {
        animateCards();
      } else if (slides[currentSlide].id === 'us-insight') {
        animateDiagramCells();
      } else if (slides[currentSlide].id === 'calendar-insight') {
        animateWaves();
      } else if (slides[currentSlide].id === 'economic-insight') {
        animateIndicators();
      } else if (slides[currentSlide].id === 'demographic-insight') {
        animateFactors();
      } else if (slides[currentSlide].id === 'vaccination-insight') {
        animateVaccinationImpact();
      } else if (slides[currentSlide].id === 'conclusion') {
        animateSequential();
      }
      
      // Allow animation to complete
      setTimeout(() => {
        isAnimating = false;
      }, 800);
    }
    
    // Event listeners for navigation dots
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goToSlide(index);
      });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToSlide(currentSlide - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToSlide(currentSlide + 1);
      }
    });
    
    // Mouse wheel navigation with debounce
    let wheelTimeout;
    document.addEventListener('wheel', (e) => {
      
      if (e.target.tagName.toLowerCase() === 'iframe') return;
      
      if (!wheelEnabled) return;
      
      clearTimeout(wheelTimeout);
      
      // Temporarily disable wheel navigation
      wheelEnabled = false;
      
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0) {
          // Scroll down
          goToSlide(currentSlide + 1);
        } else {
          // Scroll up
          goToSlide(currentSlide - 1);
        }
        
        // Re-enable wheel navigation after a delay
        setTimeout(() => {
          wheelEnabled = true;
        }, 1000);
      }, 50);
    }, { passive: true });
    
    // Touch navigation
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
      
      if (e.target.tagName.toLowerCase() === 'iframe') return;
      
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      
      if (e.target.tagName.toLowerCase() === 'iframe') return;
      
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
      const threshold = 50;
      if (touchStartY - touchEndY > threshold) {
        // Swipe up
        goToSlide(currentSlide + 1);
      } else if (touchEndY - touchStartY > threshold) {
        // Swipe down
        goToSlide(currentSlide - 1);
      }
    }
    
    // Animation functions for enhanced visual elements
    function animateCards() {
      const cards = document.querySelectorAll('.impact-card');
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 100 + (index * 200));
      });
    }
    
    function animateDiagramCells() {
      const cells = document.querySelectorAll('.diagram-cell');
      cells.forEach((cell, index) => {
        cell.style.opacity = '0';
        cell.style.transform = 'scale(0.9)';
        setTimeout(() => {
          cell.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          cell.style.opacity = '1';
          cell.style.transform = 'scale(1)';
        }, 100 + (index * 200));
      });
    }
    
    function animateWaves() {
      const waves = document.querySelectorAll('.wave');
      waves.forEach((wave, index) => {
        wave.style.opacity = '0';
        wave.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          wave.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          wave.style.opacity = '1';
          wave.style.transform = 'translateX(0)';
        }, 100 + (index * 200));
      });
    }
    
    function animateIndicators() {
      const indicators = document.querySelectorAll('.indicator');
      indicators.forEach((indicator, index) => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(20px)';
        setTimeout(() => {
          indicator.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          indicator.style.opacity = '1';
          indicator.style.transform = 'translateY(0)';
        }, 100 + (index * 200));
      });
    }
    
    function animateFactors() {
      const scaleBar = document.querySelector('.scale-bar');
      const factors = document.querySelectorAll('.factor');
      
      if (scaleBar) {
        scaleBar.style.opacity = '0';
        scaleBar.style.transform = 'scaleX(0.9)';
        setTimeout(() => {
          scaleBar.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          scaleBar.style.opacity = '1';
          scaleBar.style.transform = 'scaleX(1)';
        }, 100);
      }
      
      factors.forEach((factor, index) => {
        factor.style.opacity = '0';
        factor.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          factor.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          factor.style.opacity = '1';
          factor.style.transform = 'translateX(0)';
        }, 300 + (index * 200));
      });
    }
    
    function animateVaccinationImpact() {
      const timeline = document.querySelector('.impact-timeline');
      const columns = document.querySelectorAll('.comparison-column');
      const findings = document.querySelectorAll('.finding');
      
      if (timeline) {
        timeline.style.opacity = '0';
        setTimeout(() => {
          timeline.style.transition = 'opacity 0.7s ease';
          timeline.style.opacity = '1';
        }, 100);
      }
      
      columns.forEach((column, index) => {
        column.style.opacity = '0';
        column.style.transform = 'translateY(20px)';
        setTimeout(() => {
          column.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          column.style.opacity = '1';
          column.style.transform = 'translateY(0)';
        }, 400 + (index * 300));
      });
      
      findings.forEach((finding, index) => {
        finding.style.opacity = '0';
        finding.style.transform = 'translateY(20px)';
        setTimeout(() => {
          finding.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          finding.style.opacity = '1';
          finding.style.transform = 'translateY(0)';
        }, 1000 + (index * 200));
      });
    }
    
    function animateSequential() {
      const items = document.querySelectorAll('.sequential-item');
      items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        setTimeout(() => {
          item.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }, 300 + (index * 400));
      });
    }
    
    // Handle iframe message events for communication with visualizations
    window.addEventListener('message', function(event) {
      console.log('Message received from visualization:', event.data);
    });
    
    // Add communication message to iframes when they become active
    function notifyIframe(iframe) {
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'presentation-active',
            slideId: iframe.closest('.slide').id
          }, '*');
        }
      } catch (e) {
        console.warn('Could not communicate with iframe:', e);
      }
    }
    
    // Reset animations when coming back to a slide
    function resetAnimations() {
      const animatedElements = document.querySelectorAll('.impact-card, .diagram-cell, .wave, .indicator, .factor, .comparison-column, .finding, .sequential-item');
      animatedElements.forEach(element => {
        element.style.opacity = '';
        element.style.transform = '';
        element.style.transition = '';
      });
    }
    
    // Ensure all iframes are properly loaded
    function preloadIframes() {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.addEventListener('load', function() {
          console.log('Iframe loaded:', iframe.src);
        });
        
        iframe.addEventListener('error', function() {
          console.error('Error loading iframe:', iframe.src);
          const slide = iframe.closest('.slide');
          slide.innerHTML = `
            <div class="viz-error">
              <h3>Visualization could not be loaded</h3>
              <p>There was an error loading: ${iframe.src}</p>
              <p>Please check that the file path is correct.</p>
            </div>
          `;
        });
      });
    }
    
    // Allow iframes to be fully responsive
    function resizeIframes() {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const slide = iframe.closest('.slide');
        if (slide && slide.classList.contains('active')) {
          notifyIframe(iframe);
        }
      });
    }
    
    // Initialize
    preloadIframes();
    
    // Handle window resize
    window.addEventListener('resize', function() {
      resizeIframes();
    });
    
    // Go to specific slide if hash is present
    const hash = window.location.hash;
    if (hash) {
      const slideId = hash.substring(1);
      const slideIndex = Array.from(slides).findIndex(slide => slide.id === slideId);
      if (slideIndex >= 0) {
        goToSlide(slideIndex);
      }
    }
  });