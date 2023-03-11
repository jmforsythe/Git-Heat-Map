// Request file with with given parameters
function loadFile(filePath, paramsObj) {
    let result = null
    let xmlhttp = new XMLHttpRequest()
    const searchParams = new URLSearchParams()
    for (const key in paramsObj) {
        paramsObj[key].forEach((value) => searchParams.append(key, value))
    }
    if (searchParams.toString() != "") filePath += `?${searchParams.toString()}`
    xmlhttp.open("GET", filePath, false)
    xmlhttp.send()
    if (xmlhttp.status==200) {
        result = xmlhttp.responseText
    }
    return result
}

function sort_by_val(j) {
    if ("children" in j) {
        j.children.forEach(sort_by_val)
        j.children.sort((a,b) => b.val-a.val)
    }
}

// Part of the squarified treemap algorithm
// Given a list of (area) values and a width that they need to fit into, return
// the worst aspect ratio of any of these boxes when placed in a line
 function worst(R, w) {
    const s = R.reduce((acc,x) => acc+x, 0)
    if (s == 0 || w == 0) return -Infinity
    let m = 0
    const ws2 = (w**2)/(s**2)
    for (let i=0; i<R.length; i++) {
        const r = R[i]
        m = Math.max(m, r*ws2, 1/(ws2*r))
    }
    return m
}

NEST = true
MIN_AREA = 0
MIN_AREA_USER_SET = false

// Given a rectangular canvas and a list of children, will allocate them into 
// rows based on the squarified treemap algorithm
function squarify(x, y, width, height, children_in, parent_path, level, SVG_ROOT) {
    const children = children_in
    let children_out = []
    width = Math.max(0,width)
    height = Math.max(0,height)
    let size = width >= height ? height : width
    let row = []
    let cur_worst = Infinity
    for (let i=0; i<children.length; i++) {
        let possible_worst = worst((row.concat(children[i])).map((c) => c.val), size)
        if (cur_worst >= possible_worst) {
            row.push(children[i])
            cur_worst = possible_worst
        }
        else break
    }
    const i = row.length
    children_out.push(...handle_row(row, x, y, width, height, parent_path, level, SVG_ROOT))

    let area = row.reduce((acc, c) => acc+c.val, 0)
    let size_used = area / size
    if (width >= height) {
        x = x + size_used
        width = width - size_used
    } else {
        y = y + size_used
        height = height - size_used
    }

    const tmp = children.slice(i)
    if (tmp && tmp.length != 0) {
        children_out.push(...squarify(x, y, width, height, children.slice(i), parent_path, level, SVG_ROOT))
    }
    return children_out
}

// Given a rectangular canvas and a list of items that will be displayed in one row,
// produce objects for these items and their children
function handle_row(row, x, y, width, height, parent_path, level, SVG_ROOT) {
    let row_area = row.reduce((acc, cur) => acc+cur.val, 0)
    let out = []
    row.forEach((val, index, array) => {
        let box_area = val.val
        if (width >= height) {
            const row_width = height != 0 ? row_area / height : 0
            const box_height = row_width != 0 ? box_area / row_width : 0
                let el = {"text": val.name, "area": box_area, "x": x, "y": y, "width": row_width, "height": box_height, "parent": parent_path, "level": level}
                if (NEST && "children" in val) el.children = squarify(x, y, row_width, box_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                out.push(el)
                y += box_height
        } else {
            const row_height = width != 0 ? row_area / width : 0
            const box_width = row_height != 0 ? box_area / row_height : 0
                let el = {"text": val.name, "area": box_area, "x": x, "y": y, "width": box_width, "height": row_height, "parent": parent_path, "level": level}
                if (NEST && "children" in val) el.children = squarify(x, y, box_width, row_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                out.push(el)
                x += box_width
        }
    })
    return out
}

// Turns our object into an svg element
function get_box_text_element(obj) {
    const is_leaf = !("children" in obj)

    let element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    let box = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    let text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    let title = document.createElementNS('http://www.w3.org/2000/svg', 'title')

    element.setAttribute("x", `${obj.x}`)
    element.setAttribute("y", `${obj.y}`)
    element.setAttribute("width", `${obj.width}`)
    element.setAttribute("height", `${obj.height}`)
    element.classList.add(`svg_level_${obj.level}`)
    if (is_leaf) element.classList.add("svg_leaf")
    const path = `${obj.parent}/${obj.text}`
    element.setAttribute("id", `svg_path_${path}`)

    box.classList.add("svg_box")
    box.setAttribute("fill", "url(#Gradient2)")
    box.setAttribute("fill-opacity", "20%")

    const txt = document.createTextNode(obj.text)
    text.appendChild(txt)
    text.classList.add("svg_text")
    text.setAttribute("x", "50%")
    text.setAttribute("y", "50%")
    text.setAttribute("dominant-baseline", "middle")
    text.setAttribute("text-anchor", "middle")
    let font_size = Math.min(1.5*obj.width/obj.text.length, 1*obj.height)
    text.setAttribute("font-size", `${font_size}`)
    text.setAttribute("stroke-width", `${font_size/80}`)

    const title_txt = document.createTextNode(`${obj.area}\n${path}`)
    title.appendChild(title_txt)

    if (obj.level == 0) {
        if (!is_leaf) element.onclick = () => {
            back_stack.push(obj.parent)
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path, get_hue())
        }
        element.onmouseover = () => box.classList.add("svg_box_selected")
        element.onmouseout = () => box.classList.remove("svg_box_selected")
    }

    element.appendChild(box)
    element.appendChild(text)
    element.appendChild(title)

    if (obj.area >= Math.max(0, MIN_AREA)) {
        element.classList.add("is_visible")
    }

    return element
}

function fraction_to_saturation_and_lightness(fraction) {
    let percentage = fraction*100
    sat_x1 = 0.5
    sat_x0 = 40
    light_x1 = -0.5
    light_x0 = 100
    return [sat_x1*percentage+sat_x0, light_x1*percentage+light_x0]
}

function delete_children(node) {
    node.querySelectorAll("svg").forEach((child) => node.removeChild(child))
}

function get_child_from_path(obj, path) {
    if (path[0] == "/") path = path.slice(1)
    if (path == "") return obj
    const index = path.indexOf("/")
    if (index == -1) {
        desired_child = obj.children.filter((child) => child.name == path)
        if (desired_child.length == 1) {
            return desired_child[0]
        }
    } else {
        desired_child = obj.children.filter((child) => child.name == path.slice(0,index))
        if (desired_child.length == 1) {
            return get_child_from_path(desired_child[0], path.slice(index+1))
        }
    }
    return {}
}

// Given an object in the style generated by handle_row, draw the boxes as necessary
function draw_tree(obj_tree, SVG_ROOT) {
    // Draw children first so parent directory draws on top and so is clickable
    if (obj_tree && "children" in obj_tree) obj_tree.children.forEach((child) => draw_tree(child, SVG_ROOT))

    // Connect object model to actual displayed elements
    obj_tree.SVG_ELEMENT = get_box_text_element(obj_tree)

    // Separate function so that we can update element colour dynamically
    obj_tree.update_highlight = () => {
        const rect = obj_tree.SVG_ELEMENT.querySelector(".svg_box")
        if ("hue" in obj_tree && "fraction" in obj_tree && rect) {
            [saturation, lightness] = fraction_to_saturation_and_lightness(obj_tree.fraction)
            rect.style["fill"] = `hsl(${obj_tree.hue},${saturation}%,${lightness}%)`
            rect.style["fill-opacity"] = "100%"
        }
    }

    obj_tree.highlight = (hue, fraction) => {
        obj_tree.hue = hue
        obj_tree.fraction = fraction
        obj_tree.update_highlight()
    }

    // Modifies text that appears when hovering over element
    obj_tree.set_title = (text) => {
        const alt_text = obj_tree.SVG_ELEMENT.querySelector("title")
        if (alt_text) {
            alt_text.textContent = alt_text.textContent.concat(`\n${text}`)
        }
    }
    SVG_ROOT.appendChild(obj_tree.SVG_ELEMENT)
}

// Get a list of all highlighted objects so we can more easily modify them
function get_objs_to_highlight(obj_tree, highlighting_obj) {
    let out = []
    if ("children" in highlighting_obj) highlighting_obj.children.forEach((child) => {
        obj_tree_child = obj_tree.children.find((child2) => child2.text == child.name)
        if (obj_tree_child) out.push(...get_objs_to_highlight(obj_tree_child, child))
    })
    else if (highlighting_obj.val > 0) {
        obj_tree.highlight_value = highlighting_obj.val
        out.push(obj_tree)
    }
    return out
}

function set_alt_text(obj_tree, highlighting_obj) {
    if ("children" in highlighting_obj) highlighting_obj.children.forEach((child) => {
        set_alt_text(obj_tree.children.find((child2) => child2.text == child.name), child)
    })
    obj_tree.set_title(highlighting_obj.val)
}

// Highlight based on what fraction of a files changes are covered by the given filter
// If false will highlight based on total changes to that file in the given filter
FRACTION_HIGHLIGHTING = true

function display_filetree(filetree_obj, highlighting_obj, SVG_ROOT, x, y, aspect_ratio, cur_path, hue) {
    delete_children(SVG_ROOT)
    const area = filetree_obj.val
    const width = Math.sqrt(area*aspect_ratio)
    const height = area / width

    if (!MIN_AREA_USER_SET) {
        MIN_AREA = Math.floor(area / 5000)
        document.getElementById("size_picker_number").value = MIN_AREA
    }

    SVG_ROOT.setAttribute("viewBox", `0 0 ${width} ${height}`)
    const background_svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    background_svg.classList.add("svg_background")
    SVG_ROOT.appendChild(background_svg)

    let obj_tree = "children" in filetree_obj ? squarify(x,y,width,height,filetree_obj.children, cur_path, 0, SVG_ROOT) : handle_row([filetree_obj], x, y, width, height, cur_path, 0, SVG_ROOT)

    obj_tree.forEach((val) => draw_tree(val, SVG_ROOT))

    let objs_to_highlight = get_objs_to_highlight({"children": obj_tree}, highlighting_obj)
    if (Array.isArray(objs_to_highlight) && objs_to_highlight.length > 0) {
        const get_val = (obj) => obj.highlight_value
        const get_frac = (obj) => obj.highlight_value / obj.area
        const highlight_func = FRACTION_HIGHLIGHTING ? get_frac : get_val
        const max_val = objs_to_highlight.reduce((prev, cur) => Math.max(prev, highlight_func(cur)), 0)
        objs_to_highlight.forEach((obj) => obj.highlight(hue, highlight_func(obj)/max_val))
        set_alt_text({"children": obj_tree, "set_title": () => {}}, highlighting_obj)
    }
}

function display_filetree_path(filetree_obj, highlighting_obj, path, hue) {
    const [SVG_ROOT, x, y, aspect_ratio] = get_drawing_params()
    display_filetree(get_child_from_path(filetree_obj, path), get_child_from_path(highlighting_obj, path), SVG_ROOT, x, y, aspect_ratio, path, hue)
}

function get_drawing_params() {
    const SVG_ROOT = document.getElementById("treemap_root_svg")
    const vw = Math.max(SVG_ROOT.clientWidth || 0, SVG_ROOT.innerWidth || 0)
    const vh = Math.max(SVG_ROOT.clientHeight || 0, SVG_ROOT.innerHeight || 0)
    const aspect_ratio = vw/vh
    const x = 0
    const y = 0
    return [SVG_ROOT, x, y, aspect_ratio]
}

async function display_filetree_with_params(filetree_params, highlight_params, hue) {
    highlighting_obj_global = await JSON.parse(loadFile(`${DATABASE_NAME}/highlight.json`, highlight_params))
    back_stack = []
    display_filetree_path(filetree_obj_global, highlighting_obj_global, "", hue)
}

function main() {
    display_filetree_path(filetree_obj_global, highlighting_obj_global, "", 0)
    update_styles(document.getElementById("treemap_root_svg"), 1)
}

let filetree_obj_global = JSON.parse(loadFile(`${DATABASE_NAME}/filetree.json`))
sort_by_val(filetree_obj_global)
let highlighting_obj_global = {"name": "/", "val": 0, "children": []}
let back_stack = []

main()
