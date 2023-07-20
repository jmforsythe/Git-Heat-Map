function make_list_item(text) {
    let el = document.createElement("div")
    el.classList.add("list_item")
    let text_el = document.createElement("div", )
    el.appendChild(text_el)
    text_el.classList.add("list_item_text")
    text_el.innerText = text
    let close_button = document.createElement("button")
    el.appendChild(close_button)
    close_button.innerText = "x";
    close_button.width = "1em";
    close_button.classList.add("close_button")
    close_button.onclick = () => {
        el.parentElement.removeChild(el)
    }
    el.onclick = () => {
        el.classList.toggle("item_negated")
    }
    return el
}

function filter_entry_setup(filter_id) {
    let filter = document.getElementById(filter_id)
    let filter_entry = filter.querySelector(".text_entry")
    let filter_submit = filter.querySelector(".text_submit")
    let filter_list = filter.querySelector(".item_list")
    if (filter_entry && filter_submit) {
        filter_submit.onclick = () => {
            if (filter_entry.value != "") { 
                filter_list.appendChild(make_list_item(filter_entry.value))
            }
        }
    }
}

function date_entry_setup(filter_id) {
    let filter = document.getElementById(filter_id)
    let [filter_entry_start, filter_entry_end] = filter.querySelectorAll(".datetime_entry")
    let filter_submit = filter.querySelector(".date_submit")
    let filter_list = filter.querySelector(".item_list")
    if (filter_entry_start && filter_entry_end && filter_submit) {
        filter_submit.onclick = () => {
            if (filter_entry_start.value != "" && filter_entry_end.value != "") {
                filter_list.appendChild(make_list_item(filter_entry_start.value + " " + filter_entry_end.value))
            }
        }
    }
}

function get_include_exclude(filter_name, filter_id) {
    let filter = document.getElementById(filter_id)
    let filter_list = filter.querySelector(".item_list")
    let children = filter_list.querySelectorAll(".list_item")
    let include = []
    let exclude = []
    children.forEach((c) => {
        if (c.classList.contains("item_negated")) {
            exclude.push(c.querySelector(".list_item_text").innerText)
        } else {
            include.push(c.querySelector(".list_item_text").innerText)
        }
    })
    const include_name = filter_name+"_include"
    const exclude_name = filter_name+"_exclude"
    out = {}
    out[include_name] = include
    out[exclude_name] = exclude
    return out
}

function submodule_tree_list_generator(tree, parent_path) {
    let child_lists = tree.submodules.map((child_tree) => submodule_tree_list_generator(child_tree, tree.path))
    let li = document.createElement("li")
    let label = document.createElement("label")
    let input = document.createElement("input")
    input.type = "checkbox"
    input.checked = tree.enabled
    input.addEventListener(("change"), (event) => {
        tree.enabled = input.checked
    })
    let text = document.createTextNode(tree.path.slice(parent_path.length))
    label.appendChild(input)
    label.appendChild(text)
    li.appendChild(label)
    if (child_lists.length > 0) {
        let ul = document.createElement("ul")
        child_lists.forEach((c) => ul.appendChild(c))
        li.appendChild(ul)
    }
    return li
}

function submodule_tree_setup() {
    let el = document.getElementById("submodule_tree")
    if (SUBMODULE_TREE.submodules.length > 0) {
        let ul = document.createElement("ul")
        SUBMODULE_TREE.submodules.forEach((submodule) => {
            ul.appendChild(submodule_tree_list_generator(submodule, ""))
        })
        el.appendChild(ul)
        el.classList.remove("hidden")
    }
}

function text_depth_setup() {
    let el = document.getElementById("text_depth_number")
    el.addEventListener("input", (event) => {
        update_styles(document.getElementById("treemap_root_svg"), el.value)
    })
}

function size_picker_setup() {
    let el = document.getElementById("size_picker_number")
    el.value = MIN_AREA
    el.addEventListener("input", (event) => {
        MIN_AREA = el.value
        MIN_AREA_USER_SET = true
    })
}

function color_picker_setup() {
    let el = document.getElementById("sidebar_color_picker")
    let input_number = el.querySelector(".color_picker_number")
    let input_range = el.querySelector(".color_picker_range")
    let display = el.querySelector(".color_display")
    display.style["background-color"] = `hsl(${input_number.value},100%,50%)`
    input_number.addEventListener("input", (event) => {
        display.style["background-color"] = `hsl(${event.target.value},100%,50%)`
        input_range.value = event.target.value
    })
    input_range.addEventListener("input", (event) => {
        display.style["background-color"] = `hsl(${event.target.value},100%,50%)`
        input_number.value = event.target.value
    })
}

function get_hue() {
    let el = document.getElementById("sidebar_color_picker")
    let input_number = el.querySelector(".color_picker_number")
    return input_number.value
}

function get_query_object() {
    const query_list = [["email", "email_filter"], ["commit", "commit_filter"], ["filename", "filename_filter"], ["datetime", "datetime_filter"]]
    let query = {}
    query_list.forEach((q) => query = {...query, ...get_include_exclude(...q)})
    return query
}

function submit_query_setup() {
    let submit_button = document.getElementById("submit_query")
    if (submit_button) {
        submit_button.onclick = () => {
            const query = get_query_object()
            save_query(query)
            display_filetree_with_params({}, query, get_hue())
        }
    }
}

function fraction_highlighting_setup() {
    const fraction_highlighting_control = document.getElementById("hightlight_control")
    if (fraction_highlighting_control) {
        fraction_highlighting_control.onchange = () => {
            FRACTION_HIGHLIGHTING = fraction_highlighting_control.checked
        }
    }
}

function refresh_button_setup() {
    let refresh_button = document.getElementById("refresh_button")
    if (refresh_button) {
        refresh_button.onclick = () => {
            path = back_stack.slice(-1)
            if (path == null) path = ""
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path, get_hue())
        }
    }
}

function back_button_setup() {
    let back_button = document.getElementById("back_button")
    if (back_button) {
        back_button.onclick = () => {
            path = back_stack.pop()
            if (path == null) path = ""
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path, get_hue())
        }
    }
}

function export_svg_setup() {
    const el = document.getElementById("save_button")
    const button = el.querySelector("input")
    button.onclick = () => {
        const link = document.createElement("a")
        const svg_data = document.getElementById("treemap_root_svg").outerHTML
        const blob = new Blob([svg_data], {type:"image/svg+xml;charset=utf-8"})
        const download_url = URL.createObjectURL(blob)
        link.href = download_url
        link.download = `${DATABASE_NAME}.svg`
        link.click()
    }
}

function save_query(query) {
    localStorage.setItem(document.title + "_stored_query", JSON.stringify(query))
}

function load_query() {
    const query_list = [["email", "email_filter"], ["commit", "commit_filter"], ["filename", "filename_filter"], ["datetime", "datetime_filter"]]
    const query = JSON.parse(localStorage.getItem(document.title + "_stored_query"))
    if (!query) return
    query_list.forEach((q) => {
        const name = q[0]
        const filter_id = q[1]
        const filter = document.getElementById(filter_id)
        const filter_list = filter.querySelector(".item_list")
        if (name+"_include" in query) {
            query[name+"_include"].forEach((val) => {
                if (val && val != "") { 
                    filter_list.appendChild(make_list_item(val))
                }
            })
        }
        if (name+"_exclude" in query) {
            query[name+"_exclude"].forEach((val) => {
                if (val && val != "") { 
                    filter_list.appendChild(make_list_item(val)).classList.toggle("item_negated")
                }
            })
        }
    })
}

function main() {
    filter_entry_setup("email_filter")
    filter_entry_setup("commit_filter")
    filter_entry_setup("filename_filter")
    date_entry_setup("datetime_filter")
    submodule_tree_setup()
    text_depth_setup()
    size_picker_setup()
    color_picker_setup()
    submit_query_setup()
    fraction_highlighting_setup()
    refresh_button_setup()
    back_button_setup()
    export_svg_setup()
    load_query()
}

main()
