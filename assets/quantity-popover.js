if (!customElements.get('quantity-popover')) {
  customElements.define(
    'quantity-popover',
    class QuantityPopover extends HTMLElement {
      constructor() {
        super();
        this.infoButton = this.querySelector('.quantity-popover__info-button');
        this.popover = this.querySelector('.quantity-popover__info');
        this.closeButton = this.querySelector('.quantity-popover__info-close button');

        if (this.infoButton && this.popover) {
          this.infoButton.addEventListener('click', this.togglePopover.bind(this));
        }

        if (this.closeButton) {
          this.closeButton.addEventListener('click', this.closePopover.bind(this));
        }

        // Close popover when clicking outside
        document.addEventListener('click', (event) => {
          if (!this.contains(event.target) && this.popover && !this.popover.hidden) {
            this.closePopover();
          }
        });

        // Close popover on escape key
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && this.popover && !this.popover.hidden) {
            this.closePopover();
          }
        });
      }

      togglePopover() {
        if (this.popover.hidden) {
          this.openPopover();
        } else {
          this.closePopover();
        }
      }

      openPopover() {
        if (this.popover) {
          this.popover.hidden = false;
          this.infoButton.setAttribute('aria-expanded', 'true');
          this.infoButton.classList.add('quantity-popover__info-button--open');
        }
      }

      closePopover() {
        if (this.popover) {
          this.popover.hidden = true;
          this.infoButton.setAttribute('aria-expanded', 'false');
          this.infoButton.classList.remove('quantity-popover__info-button--open');
        }
      }
    }
  );
}

// Quantity input functionality
if (!customElements.get('quantity-input')) {
  customElements.define(
    'quantity-input',
    class QuantityInput extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector('.quantity__input');
        this.changeEvent = new Event('change', { bubbles: true });
        this.input.addEventListener('change', this.onInputChange.bind(this));
        this.querySelectorAll('button').forEach((button) =>
          button.addEventListener('click', this.onButtonClick.bind(this))
        );
      }

      onInputChange(event) {
        this.validateQtyRules();
      }

      onButtonClick(event) {
        event.preventDefault();
        const previousValue = this.input.value;

        if (event.target.name === 'plus') {
          this.input.stepUp();
        } else {
          this.input.stepDown();
        }

        if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
      }

      validateQtyRules() {
        const value = parseInt(this.input.value);
        if (this.input.min) {
          const min = parseInt(this.input.min);
          const buttonMinus = this.querySelector("button[name='minus']");
          buttonMinus.disabled = value <= min;
        }
        if (this.input.max) {
          const max = parseInt(this.input.max);
          const buttonPlus = this.querySelector("button[name='plus']");
          buttonPlus.disabled = value >= max;
        }
      }
    }
  );
}