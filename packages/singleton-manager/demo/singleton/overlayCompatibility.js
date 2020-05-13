import { OverlaysManager } from 'overlays';
import { singletonManager } from '../../index.js';

class CompatibleManager extends OverlaysManager {
  name = 'Compatible from App';

  constructor() {
    super();
    this.blocker.innerText = `Blocker for ${this.name}`;
  }

  blockingBody() {
    this.block();
  }

  unBlockingBody() {
    this.unBlock();
  }
}

const compatibleManager = new CompatibleManager();

singletonManager.set('overlays/index.js::1.x', compatibleManager);
singletonManager.set('overlays/index.js::2.x', compatibleManager);
