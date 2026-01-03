/**
 * Edit Mode Manager for popup
 * Handles unified edit mode for auth, webhook, and minDelay sections
 */

class EditModeManager {
  constructor(config) {
    this.section = config.section;
    this.editBtn = config.editBtn;
    this.displayElement = config.displayElement;
    this.editElement = config.editElement;
    this.saveCallback = config.saveCallback;
    this.loadDisplayCallback = config.loadDisplayCallback;
    this.loadEditCallback = config.loadEditCallback;
    this.saveBtnId = `save${this.section.charAt(0).toUpperCase() + this.section.slice(1)}BtnHeader`;
    this.displayRow = config.displayRow || null;
  }
}