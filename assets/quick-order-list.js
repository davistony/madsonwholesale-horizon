if (!customElements.get('quick-order-list-remove-button')) {
  customElements.define(
    'quick-order-list-remove-button',
    class QuickOrderListRemoveButton extends BulkAdd {
      constructor() {
        super();
        this.addEventListener('click', (event) => {
          event.preventDefault();
          this.startQueue(this.dataset.index, 0);
        });
      }
    }
  );
}

if (!customElements.get('quick-order-list-remove-all-button')) {
  customElements.define(
    'quick-order-list-remove-all-button',
    class QuickOrderListRemoveAllButton extends HTMLElement {
      constructor() {
        super();
        this.quickOrderList = this.closest('quick-order-list');
        const allVariants = this.quickOrderList.querySelectorAll('[data-quantity-variant-id]');
        const items = {};
        let hasVariantsInCart = false;

        allVariants.forEach((variant) => {
          const cartQty = parseInt(variant.dataset.cartQuantity);
          if (cartQty > 0) {
            hasVariantsInCart = true;
            items[parseInt(variant.dataset.quantityVariantId)] = 0;
          }
        });

        if (!hasVariantsInCart) {
          this.classList.add('hidden');
        }

        this.actions = {
          confirm: 'confirm',
          remove: 'remove',
          cancel: 'cancel',
        };

        this.addEventListener('click', (event) => {
          event.preventDefault();
          if (this.dataset.action === this.actions.confirm) {
            this.toggleConfirmation(false, true);
          } else if (this.dataset.action === this.actions.remove) {
            this.quickOrderList.updateMultipleQty(items);
            this.toggleConfirmation(true, false);
          } else if (this.dataset.action === this.actions.cancel) {
            this.toggleConfirmation(true, false);
          }
        });
      }

      toggleConfirmation(showConfirmation, showInfo) {
        this.quickOrderList
          .querySelector('.quick-order-list-total__confirmation')
          .classList.toggle('hidden', showConfirmation);
        this.quickOrderList.querySelector('.quick-order-list-total__info').classList.toggle('hidden', showInfo);
      }
    }
  );
}

if (!customElements.get('quick-order-list')) {
  customElements.define(
    'quick-order-list',
    class QuickOrderList extends BulkAdd {
      constructor() {
        super();
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.quickOrderListId = `${this.dataset.section}-${this.dataset.productId}`;
        this.sectionId = this.dataset.section;
        this.variantListInput = null;
        this.stickyHeaderElement = document.querySelector('header[class*="sticky"]') ||
          document.querySelector('header[class*="fixed"]');
        this.isListInsideModal = !!this.closest('product-modal');
        
        const pageParams = new URLSearchParams(window.location.search);
        window.pageNumber = decodeURIComponent(pageParams.get('page') || '');

        const debouncedOnChange = debounce((event) => {
          this.onChange(event);
        }, 300);

        this.addEventListener('change', debouncedOnChange.bind(this));
        this.defineInputsAndQuickOrderTable();
      }

      connectedCallback() {
        this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
          if (event.source === 'quick-add') {
            return;
          }
          this.onCartUpdate().then(() => {
            this.defineInputsAndQuickOrderTable();
          });
        });
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
      }

      onChange(event) {
        const inputValue = parseInt(event.target.value);
        this.cleanErrorMessageOnType(event);
        if (inputValue == 0) {
          this.startQueue(event.target.dataset.index, inputValue);
        } else {
          this.validateQuantity(event);
        }
      }

      onCartUpdate() {
        return new Promise((resolve, reject) => {
          fetch(`${this.getSectionsUrl()}?section_id=${this.sectionId}`)
            .then((response) => response.text())
            .then((responseText) => {
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              const sourceQty = html.querySelector(`#${this.quickOrderListId}`);
              if (sourceQty) {
                this.innerHTML = sourceQty.innerHTML;
              }
              resolve();
            })
            .catch((e) => {
              console.error(e);
              reject(e);
            });
        });
      }

      getSectionsToRender() {
        return [
          {
            id: this.quickOrderListId,
            section: document.getElementById(this.quickOrderListId).dataset.section,
            selector: `#${this.quickOrderListId} .js-contents`,
          },
          {
            id: 'cart-icon-bubble',
            section: 'cart-icon-bubble',
            selector: '.shopify-section',
          },
          {
            id: `quick-order-list-live-region-text-${this.dataset.productId}`,
            section: 'cart-live-region-text',
            selector: '.shopify-section',
          },
          {
            id: 'CartDrawer',
            selector: '#CartDrawer',
            section: 'cart-drawer',
          },
        ];
      }

      updateMultipleQty(items) {
        this.querySelector('.quick-order-list__container').classList.add('quick-order-list__container--disabled');

        const body = JSON.stringify({
          updates: items,
          sections: this.getSectionsToRender().map((section) => section.section),
          sections_url: this.getSectionsUrl(),
        });

        fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
          .then((response) => {
            return response.text();
          })
          .then((state) => {
            const parsedState = JSON.parse(state);
            this.renderSections(parsedState, items);
          })
          .catch(() => {
            this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
            const errors = document.getElementById('quick-order-list-live-region-text-' + this.dataset.productId);
            errors.textContent = window.cartStrings.error;
          })
          .finally(() => {
            this.querySelector('.quick-order-list__container').classList.remove('quick-order-list__container--disabled');
          });
      }

      renderSections(parsedState, items) {
        this.getSectionsToRender().forEach((section => {
          const sectionElement = document.getElementById(section.id);
          if (
            sectionElement &&
            sectionElement.parentElement &&
            sectionElement.parentElement.classList.contains('drawer')
          ) {
            parsedState.items.length > 0
              ? sectionElement.parentElement.classList.remove('is-empty')
              : sectionElement.parentElement.classList.add('is-empty');
            setTimeout(() => {
              document.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.cart.close.bind(this.cart));
            });
          }
          const elementToReplace =
            sectionElement && sectionElement.querySelector(section.selector)
              ? sectionElement.querySelector(section.selector)
              : sectionElement;
          if (elementToReplace) {
            if (section.selector === `#${this.quickOrderListId} .js-contents` && this.ids.length > 0) {
              this.ids.flat().forEach((i) => {
                const variantElement = elementToReplace.querySelector(`#Variant-${i}`);
                if (variantElement) {
                  variantElement.innerHTML = this.getSectionInnerHTML(
                    parsedState.sections[section.section],
                    `#Variant-${i}`
                  );
                }
              });
            } else {
              elementToReplace.innerHTML = this.getSectionInnerHTML(
                parsedState.sections[section.section],
                section.selector
              );
            }
          }
        }));
        this.defineInputsAndQuickOrderTable();
        this.addMultipleDebounce();
        this.ids = [];
      }

      getTableHead() {
        return document.querySelector('.quick-order-list__table thead');
      }

      getTotalBar() {
        return this.querySelector('.quick-order-list__total');
      }

      scrollQuickOrderListTable() {
        if (!this.variantListInput) return;
        
        const inputTopBorder = this.variantListInput.getBoundingClientRect().top;
        const inputBottomBorder = this.variantListInput.getBoundingClientRect().bottom;

        if (this.isListInsideModal) {
          const totalBarCrossesInput = inputBottomBorder > this.getTotalBar().getBoundingClientRect().top;
          const tableHeadCrossesInput = inputTopBorder < this.getTableHead().getBoundingClientRect().bottom;

          if (totalBarCrossesInput || tableHeadCrossesInput) {
            this.scrollToCenter();
          }
        } else {
          const stickyHeaderBottomBorder =
            this.stickyHeaderElement && this.stickyHeaderElement.getBoundingClientRect().bottom;
          const totalBarCrossesInput = inputBottomBorder > this.getTotalBar().getBoundingClientRect().top;
          const tableHeadCrossesInput = inputTopBorder < (stickyHeaderBottomBorder || 0);

          if (totalBarCrossesInput || tableHeadCrossesInput) {
            this.scrollToCenter();
          }
        }
      }

      scrollToCenter() {
        const top = this.variantListInput.getBoundingClientRect().top - window.innerHeight / 2;
        window.scrollTo({ top: top + window.scrollY, behavior: 'smooth' });
      }

      switchVariants(event) {
        this.variantListInput = event.target;
        this.scrollQuickOrderListTable();
      }

      defineInputsAndQuickOrderTable() {
        this.allInputsArray = Array.from(this.querySelectorAll('input[type="number"]'));
        this.quickOrderListTable = this.querySelector('.quick-order-list__table');
        if (this.quickOrderListTable) {
          this.quickOrderListTable.addEventListener('focusin', this.switchVariants.bind(this));
        }
      }

      cleanErrorMessageOnType(event) {
        event.target.addEventListener('keydown', () => {
          event.target.setCustomValidity(' ');
          event.target.reportValidity();
        });
      }

      validateInput(target) {
        if (target.max) {
          return (
            parseInt(target.value) == 0 ||
            (parseInt(target.value) >= parseInt(target.dataset.min) &&
              parseInt(target.value) <= parseInt(target.max) &&
              parseInt(target.value) % parseInt(target.step) == 0)
          );
        } else {
          return (
            parseInt(target.value) == 0 ||
            (parseInt(target.value) >= parseInt(target.dataset.min) &&
              parseInt(target.value) % parseInt(target.step) == 0)
          );
        }
      }

      validateQuantity(event) {
        const inputValue = parseInt(event.target.value);
        const index = event.target.dataset.index;

        if (inputValue < event.target.dataset.min) {
          this.setValidity(event, index, `Minimum quantity is ${event.target.dataset.min}`);
        } else if (inputValue > parseInt(event.target.max)) {
          this.setValidity(event, index, `Maximum quantity is ${event.target.max}`);
        } else if (inputValue % parseInt(event.target.step) != 0) {
          this.setValidity(event, index, `Must be sold in multiples of ${event.target.step}`);
        } else {
          event.target.setCustomValidity('');
          event.target.reportValidity();
          this.startQueue(index, inputValue);
        }
      }

      setValidity(event, index, message) {
        event.target.setCustomValidity(message);
        event.target.reportValidity();
        this.resetQuantityInput(index);
        event.target.select();
      }

      resetQuantityInput(id) {
        const input = this.querySelector(`#Quantity-${id}`);
        if (input) {
          input.value = input.getAttribute('value');
        }
        this.isEnterPressed = false;
      }

      getSectionsUrl() {
        if (window.pageNumber) {
          return `${window.location.pathname}?page=${window.pageNumber}`;
        } else {
          return `${window.location.pathname}`;
        }
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
      }
    }
  );
}

// Helper functions that need to be available globally
function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// PubSub system for cart updates
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
};

const subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }
  subscribers[eventName].push(callback);
  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter(cb => cb !== callback);
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach(callback => {
      callback(data);
    });
  }
}