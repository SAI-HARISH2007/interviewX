// Lightweight UI primitives: toast notifications and a modal dialog.
// Plain DOM, no dependencies. Used across the app for consistent, accessible feedback.

const ToastManager = {
    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'status');
        toast.textContent = message;

        this._getContainer().appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    },

    _getContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        return container;
    }
};

const Modal = {
    // Open a modal with a title and HTML body. Returns { close, overlay }.
    open({ title, bodyHtml, actions = [] }) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', title);

        const actionsHtml = actions.map((action, index) =>
            `<button type="button" class="btn ${action.className || 'primary'}" data-modal-action="${index}">${action.label}</button>`
        ).join('');

        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${escapeHtml(title)}</h2>
                    <button type="button" class="modal-close" data-modal-close aria-label="Close">✕</button>
                </div>
                <div class="modal-body">${bodyHtml}</div>
                ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => {
            overlay.remove();
            document.removeEventListener('keydown', onKeydown);
        };

        const onKeydown = (event) => {
            if (event.key === 'Escape') close();
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();

            if (event.target.closest('[data-modal-close]')) {
                close();
                return;
            }

            const actionButton = event.target.closest('[data-modal-action]');
            if (actionButton) {
                const action = actions[Number(actionButton.dataset.modalAction)];
                close();
                if (action && action.onClick) action.onClick();
            }
        });

        document.addEventListener('keydown', onKeydown);

        const primary = overlay.querySelector('.modal-footer .btn.primary, .modal-footer .btn.danger');
        if (primary) primary.focus();

        return { close, overlay };
    },

    // Convenience: a confirm dialog that runs onConfirm when the user confirms.
    confirm({ message, title = 'Confirm', confirmText = 'Confirm', onConfirm }) {
        Modal.open({
            title,
            bodyHtml: `<p>${escapeHtml(message)}</p>`,
            actions: [
                { label: 'Cancel', className: 'secondary', onClick: () => {} },
                { label: confirmText, className: 'danger', onClick: onConfirm }
            ]
        });
    }
};
