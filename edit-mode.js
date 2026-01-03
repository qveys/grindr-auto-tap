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

  /**
   * Check if currently in edit mode
   * @returns {boolean}
   */
  isEditing() {
    return this.editElement && !this.editElement.classList.contains('hidden');
  }

  /**
   * Create save button header
   * @returns {HTMLElement}
   */
  createSaveButton() {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-icon';
    saveBtn.id = this.saveBtnId;
    saveBtn.title = 'Sauvegarder';
    saveBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    saveBtn.addEventListener('click', this.saveCallback);

    const sectionHeader = this.editBtn.closest('.section-header');
    if (sectionHeader) {
      sectionHeader.appendChild(saveBtn);
    }

    return saveBtn;
  }

  /**
   * Get or create save button
   * @returns {HTMLElement}
   */
  getSaveButton() {
    let saveBtn = document.getElementById(this.saveBtnId);
    if (!saveBtn) {
      saveBtn = this.createSaveButton();
    }
    return saveBtn;
  }

  /**
   * Enter edit mode
   */
  enterEditMode() {
    if (this.displayElement) {
      this.displayElement.classList.add('hidden');
    }
    if (this.editElement) {
      this.editElement.classList.remove('hidden');
    }

    if (this.displayRow) {
      this.displayRow.classList.add('hidden');
    }

    this.editBtn.style.display = 'none';
    const saveBtn = this.getSaveButton();
    saveBtn.style.display = 'flex';

    if (this.loadEditCallback) {
      this.loadEditCallback();
    }
  }

  /**
   * Exit edit mode
   */
  exitEditMode() {
    if (this.displayElement) {
      this.displayElement.classList.remove('hidden');
    }
    if (this.editElement) {
      this.editElement.classList.add('hidden');
    }

    if (this.displayRow) {
      this.displayRow.classList.remove('hidden');
    }

    this.editBtn.style.display = 'flex';
    const saveBtn = document.getElementById(this.saveBtnId);
    if (saveBtn) {
      saveBtn.style.display = 'none';
    }

    if (this.loadDisplayCallback) {
      this.loadDisplayCallback();
    }
  }
}