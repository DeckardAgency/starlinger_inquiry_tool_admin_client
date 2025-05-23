// text-editor.component.ts
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-text-editor',
    imports: [CommonModule, FormsModule],
    templateUrl: './text-editor.component.html',
    styleUrls: ['./text-editor.component.scss']
})
export class TextEditorComponent implements OnInit {
    @Input() placeholder: string = 'Start typing.';
    @Input() initialContent: string | null = '';
    @Output() contentChange = new EventEmitter<string>();

    @ViewChild('editor', { static: true }) editorElement!: ElementRef;

    textStyles: { value: string, label: string }[] = [
        { value: 'normal', label: 'Normal' },
        { value: 'h1', label: 'Heading 1' },
        { value: 'h2', label: 'Heading 2' },
        { value: 'h3', label: 'Heading 3' },
        { value: 'pre', label: 'Code' },
        { value: 'blockquote', label: 'Quote' }
    ];

    fontSizes: { value: string, label: string }[] = [
        { value: '1', label: 'Small' },
        { value: '2', label: 'Medium' },
        { value: '3', label: 'Large' },
        { value: '4', label: 'X-Large' },
        { value: '5', label: 'XX-Large' }
    ];

    selectedStyle: string = 'normal';
    selectedSize: string = '3';
    isFullscreen: boolean = false;

    // Format states
    isBold: boolean = false;
    isItalic: boolean = false;
    isUnderline: boolean = false;
    currentAlignment: string = 'left';

    constructor() {}

    ngOnInit(): void {
        if (this.initialContent) {
            this.editorElement.nativeElement.innerHTML = this.initialContent;
        }
        this.editorElement.nativeElement.addEventListener('input', () => {
            this.emitContentChange();
        });

        // Add selection change listener to update format states
        this.editorElement.nativeElement.addEventListener('mouseup', this.updateFormatState.bind(this));
        this.editorElement.nativeElement.addEventListener('keyup', this.updateFormatState.bind(this));
        this.editorElement.nativeElement.addEventListener('click', this.updateFormatState.bind(this));
    }

    @HostListener('document:selectionchange', ['$event'])
    onSelectionChange(event: Event): void {
        // Only update if our editor has focus
        if (document.activeElement === this.editorElement.nativeElement ||
            this.editorElement.nativeElement.contains(document.activeElement)) {
            this.updateFormatState();
        }
    }

    updateFormatState(): void {
        // Check for bold
        this.isBold = document.queryCommandState('bold');

        // Check for italic
        this.isItalic = document.queryCommandState('italic');

        // Check for underline
        this.isUnderline = document.queryCommandState('underline');

        // Check for alignment
        if (document.queryCommandState('justifyLeft')) {
            this.currentAlignment = 'left';
        } else if (document.queryCommandState('justifyCenter')) {
            this.currentAlignment = 'center';
        } else if (document.queryCommandState('justifyRight')) {
            this.currentAlignment = 'right';
        } else if (document.queryCommandState('justifyFull')) {
            this.currentAlignment = 'full';
        }

        // Check current block format
        const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (formatBlock) {
            // Remove the < > if they exist (browsers can return values differently)
            const cleanFormat = formatBlock.replace(/[<>]/g, '');
            this.selectedStyle = this.textStyles.find(style => style.value === cleanFormat)
                ? cleanFormat
                : 'normal';
        }

        // Check current font size
        const fontSize = document.queryCommandValue('fontSize');
        if (fontSize) {
            this.selectedSize = fontSize;
        }
    }

    execCommand(command: string, value: string | undefined = undefined): void {
        document.execCommand(command, false, value);
        this.editorElement.nativeElement.focus();
        this.emitContentChange();
        this.updateFormatState();
    }

    formatText(style: string): void {
        switch (style) {
            case 'bold':
                this.execCommand('bold');
                break;
            case 'italic':
                this.execCommand('italic');
                break;
            case 'underline':
                this.execCommand('underline');
                break;
            default:
                break;
        }
    }

    createList(type: string): void {
        if (type === 'ordered') {
            this.execCommand('insertOrderedList');
        } else {
            this.execCommand('insertUnorderedList');
        }
    }

    alignText(alignment: string): void {
        this.execCommand('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1));
        this.currentAlignment = alignment;
    }

    insertLink(): void {
        const url = prompt('Enter URL:');
        if (url) {
            this.execCommand('createLink', url);
        }
    }

    insertImage(): void {
        const url = prompt('Enter image URL:');
        if (url) {
            this.execCommand('insertImage', url);
        }
    }

    changeTextStyle(): void {
        // Remove previous formatting
        this.execCommand('removeFormat');

        // Apply new style
        if (this.selectedStyle !== 'normal') {
            this.execCommand('formatBlock', `<${this.selectedStyle}>`);
        } else {
            this.execCommand('formatBlock', '<p>');
        }
    }

    changeFontSize(): void {
        this.execCommand('fontSize', this.selectedSize);
    }

    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;
    }

    emitContentChange(): void {
        this.contentChange.emit(this.editorElement.nativeElement.innerHTML);
    }

    getContent(): string {
        return this.editorElement.nativeElement.innerHTML;
    }

    setContent(html: string): void {
        this.editorElement.nativeElement.innerHTML = html;
        this.emitContentChange();
    }
}
