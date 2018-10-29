import { dom } from "./dom-utils.js";

class ImageLoader {
    constructor(inputElement, imgElement, onImageLoaded) {
        this.img = imgElement;
        this.onImageLoaded = onImageLoaded;
        // set up browse-for-image handling
        dom.listen(inputElement, `change`, evt => this.handleFileSelect(evt));
    }

    // handler for loading a browsed image into the canvas, and caching it to localStorage
    // so that on next pageload the user doesn't have to rebrowser for their image.
    handleFileSelect(evt) {
        let files = Array.from(evt.target.files);
        let file = files[0];

        var reader = new FileReader();
        dom.listen(reader, `load`, fileLoadEvent => {
            dom.listen(this.img, `load`, () => {
                this.onImageLoaded(this.img);
            });

            this.img.src = fileLoadEvent.target.result;
        });

        reader.readAsDataURL(file);
    }
}

export { ImageLoader };
