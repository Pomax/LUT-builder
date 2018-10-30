// DOM helper functions because the regular DOM API is way too verbose
function find(qs, e) { e = e || document.body; return e.querySelector(qs); }
function add(e, t) { t = t || document.body; t.appendChild(e); }
function remove(e) { e.parentNode.removeChild(e); }
function listen(e, n, h) { e.addEventListener(n, h); }
function forget(e, n, h) { e.removeEventListener(n, h); }
function create(e, content, opts) {
    let r = document.createElement(e);
    if (content) {
        if (content.forEach) {
            content.forEach(c => r.appendChild(c));
        } else {
            r.innerHTML = content;
        }
    }
    if (opts) {
        Object.keys(opts).forEach(key => {
            r[key] = opts[key]
        });
    }
    return r;
}

const dom = {
    find,
    add,
    remove,
    listen,
    forget,
    create
};

export { dom };
