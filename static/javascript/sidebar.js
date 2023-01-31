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
    el.innerText = text
    return el
}

function email_entry_setup() {
    let email_filter = document.getElementById("email_filter")
    let email_entry = email_filter.querySelector(".text_entry")
    let email_submit = email_filter.querySelector(".text_submit")
    let email_list = email_filter.querySelector(".item_list")
    if (email_entry && email_submit) {
        const func = () => {
            if (email_entry.value != "") { 
                email_list.appendChild(make_list_item(email_entry.value))
            }
        }
        email_submit.onclick = func
    }
}

function item_list_to_js_list(filter_id) {
    let filter = document.getElementById(filter_id)
    let filter_list = filter.querySelector(".item_list")
    let children = filter_list.querySelectorAll(".list_item")
    let out = []
    children.forEach((c) => out.push(c.innerText))
    return out
}

function submit_query_setup() {
    let submit_button = document.getElementById("submit_query")
    if (submit_button) {
        submit_button.onclick = () => {
            display_filetree_with_params({}, {"emails": item_list_to_js_list("email_filter")})
        }
    }
}

function main() {
    back_button_setup()
    email_entry_setup()
    submit_query_setup()
}

main()