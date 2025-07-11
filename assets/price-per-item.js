if (!customElements.get('price-per-item')) {
  customElements.define(
    'price-per-item',
    class PricePerItem extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('variant-change', this.onVariantChange.bind(this));
      }

      onVariantChange() {
        this.updatePrice();
      }

      updatePrice() {
        const priceElement = this.querySelector('.price-per-item--current');
        if (priceElement) {
          const quantity = this.getQuantity();
          const volumePricing = this.getVolumePricing();
          
          if (volumePricing.length > 0) {
            const applicablePrice = this.getApplicablePrice(quantity, volumePricing);
            if (applicablePrice) {
              priceElement.textContent = `Each: ${this.formatMoney(applicablePrice)}`;
            }
          }
        }
      }

      getQuantity() {
        const quantityInput = this.closest('tr')?.querySelector('.quantity__input');
        return quantityInput ? parseInt(quantityInput.value) || 1 : 1;
      }

      getVolumePricing() {
        // This would typically be populated from variant data
        // For now, we'll return an empty array as a fallback
        return [];
      }

      getApplicablePrice(quantity, volumePricing) {
        let applicablePrice = null;
        
        for (const priceBreak of volumePricing) {
          if (quantity >= priceBreak.minimum_quantity) {
            applicablePrice = priceBreak.price;
          } else {
            break;
          }
        }
        
        return applicablePrice;
      }

      formatMoney(cents) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(cents / 100);
      }
    }
  );
}

if (!customElements.get('volume-pricing')) {
  customElements.define(
    'volume-pricing',
    class VolumePricing extends HTMLElement {
      constructor() {
        super();
      }
    }
  );
}