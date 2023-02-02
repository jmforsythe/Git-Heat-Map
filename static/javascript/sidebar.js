function back_button_setup() {
    let back_button = document.getElementById("back_button")
    if (back_button) {
        back_button.onclick = () => {
            path = back_stack.pop()
            if (path == null) path = ""
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path)
        }
    }
}

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
        email_submit.onclick = func
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

function submit_query_setup() {
    const query_list = [["emails", "email_filter"], ["commits", "commit_filter"]]
    let submit_button = document.getElementById("submit_query")
    if (submit_button) {
        submit_button.onclick = () => {
            let query = {}
            query_list.forEach((q) => query = {...query, ...get_include_exclude(...q)})
            display_filetree_with_params({}, query, get_hue())
        }
    }
}

function main() {
    back_button_setup()
    filter_entry_setup("email_filter")
    filter_entry_setup("commit_filter")
    submit_query_setup()
}

main()