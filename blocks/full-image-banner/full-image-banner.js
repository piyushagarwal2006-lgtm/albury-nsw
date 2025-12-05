import { createOptimizedPicture } from '../../scripts/aem.js';
import { div as divElem, p as pElem } from '../../scripts/dom-helpers.js';

const CUSTOM_CLASSES = {
  content: {
    0: 'nsw-card__title',
    1: 'nsw-card__copy',
  },
  image: {
    0: 'hero__image--desktop',
    1: 'hero__image--mobile',
  },
};

/**
 * Creates a card wrapper with predefined classes.
 * @returns {object} An object containing `cardWrapper` and `cardContentWrapper`.
 */
function createCardWrapper() {
  const cardWrapper = divElem({ class: 'nsw-card' });
  cardWrapper.classList.add('nsw-card--highlight');

  const cardContentWrapper = divElem({ class: 'nsw-card__content' });
  return { cardWrapper, cardContentWrapper };
}

function handleTitle(titleRow, bodyWrapper) {
  const titleEl = document.createElement('h4');
  titleEl.innerHTML = titleRow.innerHTML || '';
  bodyWrapper.appendChild(titleEl);
}

function handleDescription(descriptionRow, bodyWrapper) {
  let buttonContainer = null;
  if (
    descriptionRow.length
    && descriptionRow[descriptionRow.length - 1].classList.contains('button-container')
  ) {
    buttonContainer = descriptionRow.pop();
  }
  const descriptionWrapper = divElem({ class: CUSTOM_CLASSES.content[1] });
  descriptionRow.forEach((row) => {
    const clonedRow = row.cloneNode(true);

    const anchorTags = clonedRow.querySelectorAll('a');
    anchorTags.forEach((a) => {
      // Get only the direct text (not text inside nested tags)
      let directText = '';
      a.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          directText += node.textContent;
        }
      });

      const textNode = document.createTextNode(directText.trim());
      a.replaceWith(textNode);
    });

    descriptionWrapper.appendChild(clonedRow);
  });

  if (buttonContainer) {
    buttonContainer.querySelector('a')?.classList.add('nsw-button', 'nsw-button--dark');
    descriptionWrapper.appendChild(buttonContainer);
  }
  bodyWrapper.appendChild(descriptionWrapper);
}

function processImages(heroImage) {
  const imageWrapper = divElem({ class: 'hero__image' });
  const paragraphs = [...heroImage.querySelectorAll('p')];
  const pictures = [...heroImage.querySelectorAll('picture')];

  // Handle alt text (text after the last picture)
  const hasTextParagraph = paragraphs.length > 2
    || (paragraphs.length === 2
      && !paragraphs.every((p) => p.querySelector('picture')));
  const lastParagraph = hasTextParagraph ? paragraphs.at(-1) : null;
  const altText = lastParagraph?.innerText.trim() || '';

  if (altText) {
    pictures.forEach((picture) => {
      picture.querySelector('img')?.setAttribute('alt', altText);
    });
    lastParagraph.remove();
  }

  if (pictures.length === 2) {
    pictures.forEach((pic, i) => {
      const picturePara = pElem({ class: CUSTOM_CLASSES.image[i] });
      picturePara.classList.add('hero-banner-image');
      picturePara.append(pic);
      imageWrapper.append(picturePara);
    });
  } else if (pictures.length === 1) {
    pictures[0].parentNode.classList.add('hero-banner-image');
    imageWrapper.append(...heroImage.childNodes);
  }
  return imageWrapper;
}

function avoidHeightCollapse(block) {
  const heroContent = block.querySelector('.hero__content');

  if (heroContent) {
    let resizeObserver;
    let updateCount = 0;
    let lastUpdateTime = 0;

    const updateHeight = () => {
      const currentTime = performance.now();

      // If updates are happening too frequently, stop observing
      if (updateCount > 1000) {
        // eslint-disable-next-line no-console
        console.warn(
          'Hero content height update is being called too frequently',
        );
        resizeObserver.disconnect();
        return;
      }

      // Check if update is happening too quickly
      if (currentTime - lastUpdateTime < 100) {
        updateCount += 1;
      } else {
        // Reset update tracking if it's been more than 100ms
        updateCount = 1;
      }

      lastUpdateTime = currentTime;

      const height = heroContent.offsetHeight;
      document.documentElement.style.setProperty(
        '--hero-content-height',
        `${height / 2}px`,
      );
    };

    resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(heroContent);

    // Initial height update after 100ms
    setTimeout(updateHeight, 100);
  }
}

function handleImages(imagesRow) {
  const imageWrapper = processImages(imagesRow);
  imageWrapper.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false);
    img.closest('picture').replaceWith(optimizedPic);
  });
  return imageWrapper;
}

export default function decorate(block) {
  const [imagesRow, contentRow] = Array.from(block.children);
  const { cardWrapper, cardContentWrapper } = createCardWrapper();

  // The first text item is considered the title
  const [title, ...description] = contentRow.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6',
  );

  handleTitle(title, cardContentWrapper);
  handleDescription(description, cardContentWrapper);

  // Process images
  const imageWrapper = handleImages(imagesRow);

  // Replace block content
  const bodyWrapper = divElem({ class: 'hero__content' });
  block.innerHTML = '';
  cardWrapper.appendChild(cardContentWrapper);
  bodyWrapper.appendChild(cardWrapper);
  block.append(bodyWrapper, imageWrapper);

  // Avoid height collapse
  avoidHeightCollapse(block);
}
