// cache DOM lookouts to improve performance
// & create an easier to follow selector system
var DOM_BODY = document.getElementById('app_body')
var ROOT_DOM = document.querySelector("#root_app");
var DOM = {
    content_container: ROOT_DOM.querySelector(".content_container"),
    feed_end: ROOT_DOM.querySelector("#feed_end"),
    menu: ROOT_DOM.querySelector("#menu")
};
var MENU_DOM_WRAPPER = document.querySelector("#menu_wrapper");
var MENU_DOM = {
    menu_toggler: MENU_DOM_WRAPPER.querySelector("#menu_toggler"),
    menu_wrapper: MENU_DOM_WRAPPER.querySelector("#menu_wrapper"),
    options_new_amount: MENU_DOM_WRAPPER.querySelector("#options_new_amount"),
    options_old_amount: MENU_DOM_WRAPPER.querySelector("#options_old_amount"),
    options_theme: MENU_DOM_WRAPPER.querySelector("#options_theme"),
    new_options_dropdown: MENU_DOM_WRAPPER.querySelector("#new_options_dropdown"),
    old_options_dropdown: MENU_DOM_WRAPPER.querySelector("#old_options_dropdown"),
    options_dropdown: MENU_DOM_WRAPPER.querySelector("#options_dropdown")
}


// 'clean' the tweet text
// ID's are added in the
// data-rendered_from attribute
let id_remover = (data) => data["id"] + ". ";

function generateTweetElement(data, text, position) {
    let new_DOM = document.createElement("div");
    new_DOM.classList.add("tweet_element_container");
    new_DOM.innerHTML = `
    <div data-rendered_from="${position}, id=${data["id"]}" class="tweet_element">
        <div class="img_container">
            <div class="profile_image" style="background-image: url(  ${data["image"]});    "></div>
        </div>
        <div class="user_and_tweet_container">
            <div class="username_container">
                <h2>${data["username"]}</h2>
            </div>
            <div class="user_tweet_container">
                <p>${text}</p>
            </div>
        </div>
    </div>`;

    if (position === 'top') {
        DOM["content_container"].insertBefore(
            new_DOM,
            DOM["content_container"].firstElementChild
        );
    } else if (position === 'bottom') {
        DOM["content_container"].insertBefore(
            new_DOM,
            DOM["feed_end"]
        );
    }
}


// on load reset the tweet generator
fetch(`https://magiclab-twitter-interview.herokuapp.com/cristianpascu/reset`);







var new_counter = 50;
var old_counter = 50;

var display_state = [];

var max_topRenderedItems = 30;
var new_top_tweets = 2;

var history_tweets = [];
var old_bottom_tweets = 10;





function HistoryEntry(username, image, id, text) {
    this.username = username;
    this.image = image;
    this.id = id;
    this.text = text;
}




async function getNewTweets(amount) {
    try {
        const resp = await fetch(`https://magiclab-twitter-interview.herokuapp.com/cristianpascu/api?count=${amount}&afterId=${new_counter}`);
        var data = await resp.json();

        // reset generator when 
        // it reaches it's max output
        if (data[0]["id"] === 10001) {
            new_counter = 0;
            fetch(`https://magiclab-twitter-interview.herokuapp.com/cristianpascu/reset`);
        }

        data.reverse().forEach(value => {
            var tweet_text = value["text"].replace(id_remover(value), "");
            generateTweetElement(value, tweet_text, 'top');

            // keep the data of the destroyed tweets
            display_state.push(
                new HistoryEntry(value["username"], value["image"], value["id"], tweet_text)
            )
        });
        // use the afterId paramater
        // based on the new requested tweets amount
        new_counter += amount;




        // on getting new tweets
        // && if the displayed tweet elements exceed "max_topRenderedItems" //30
        // destroy older ones && kep only 30 rendered
        var destroy_elements_nr = display_state.length - max_topRenderedItems;
        for (let i = 0; i < destroy_elements_nr; i++) {
            console.log(display_state)
            history_tweets.unshift(display_state[0])
            display_state.shift()
        }
        var rendered_arr = DOM["content_container"].querySelectorAll('.tweet_element_container');
        for (let j = (rendered_arr.length - 1); j >= max_topRenderedItems; j--) {
            rendered_arr[j].remove()
        }

        rendered_bottom = [];

        // reset scroll bottom anti-spam
        end_list = false;


        // if there is even a 50px scroll, the new tweets don't push down the content
        // so, force scroll based on the new entries heights
        var new_tweets_height = 0;
        for (var i = 0; i < data.length; i++) {
            new_tweets_height += DOM["content_container"].querySelectorAll('.tweet_element_container')[i].offsetHeight;
        }
        var get_view_position = parseInt(ROOT_DOM.scrollTop, 10);
        ROOT_DOM.scrollTop = get_view_position - new_tweets_height;


    } catch (err) {
        // if err
        // retry GET new tweets
        getNewTweets(amount, true);
    }
}



async function getInitialHistory() {
    try {

        const history_resp = await fetch(
            `https://magiclab-twitter-interview.herokuapp.com/cristianpascu/api?count=${old_counter}&beforeId=${old_counter + 1}`
        );
        var history_data = await history_resp.json();

        history_data.forEach(value => {
            var tweet_text = value["text"].replace(id_remover(value), "");


            history_tweets.push(
                new HistoryEntry(value["username"], value["image"], value["id"], tweet_text)
            )
        });
        // console.warn("first_request var");
        console.warn("history_tweets", history_tweets);
    } catch (err) {
        console.warn("RETRY", ' HISTORY');

        // if err
        // retry GET preview tweets
        getInitialHistory()
    }
}





getNewTweets(20);
getInitialHistory();




var last_scroll = 0;
var reload_top_available = true;
var reload_bottom_available = true;
var available_cached_history = 50;
var rendered_bottom = [];
var end_list = false;


ROOT_DOM.addEventListener('scroll', function () {
    var TRIGGER_view_height = parseInt((window.innerHeight / 3), 10);
    var view_position = parseInt(ROOT_DOM.scrollTop, 10);

    if (reload_top_available) {

        // don't load tweets exactly at scroll top 0
        // but rather trigger @ ~1/3 of the window height
        if ((last_scroll > view_position) && (view_position < TRIGGER_view_height) && (view_position !== 0)) {
            reload_top_available = false;

            // don't spam top tweet loads
            setTimeout(() => {
                reload_top_available = true;
            }, 2000);
            getNewTweets(new_top_tweets)
        }

    }

    // same as the above, but
    // for scroll bottom
    if (reload_bottom_available && !end_list) {
        if ((last_scroll < view_position) && (view_position + window.innerHeight) > (DOM['feed_end'].offsetTop - TRIGGER_view_height)) {
            reload_bottom_available = false;

            // don't spam bottom tweet loads
            setTimeout(() => {
                reload_bottom_available = true;
            }, 1000);

      
            if (history_tweets.length < old_bottom_tweets) {
                available_cached_history = history_tweets.length;
              } else {
                available_cached_history = old_bottom_tweets;
              }

            var already_rendered_skip = rendered_bottom.length;

            for (let i = 0; i < available_cached_history; i++) {
                var value = history_tweets[i + already_rendered_skip];
                if (value === undefined) {
                    end_list = true;
                    console.warn('end_list')
                    break
                }
                var tweet_text = value["text"].replace(id_remover(value), "");
                rendered_bottom.push(value['id'])
                generateTweetElement(value, tweet_text, 'bottom');
            }


        }
    }

    // keep the last scroll value
    // in order to know if the page is scrolling 
    // to top / to bottom
    last_scroll = view_position;
});








var toggle_menu = true;

MENU_DOM["menu_toggler"].addEventListener('click', function (e) {
    console.warn(e.target.id)
    if ((e.target.id === 'menu_toggler') && !!toggle_menu) {
        MENU_DOM_WRAPPER.classList.remove('closed')
        toggle_menu = false;
    } else if ((e.target.id === 'menu_toggler') && !toggle_menu) {
        MENU_DOM_WRAPPER.classList.add('closed')
        toggle_menu = true;
    }
});




var selected_theme = 'default';
var themes = {
    'default': 'Default',
    'dark_mode': 'Dark'
}

MENU_DOM_WRAPPER.addEventListener('click', function (e) {
    var target = e.target;


    // prevent multiple nested menu openning
    MENU_DOM["new_options_dropdown"].classList.remove('open_select')
    MENU_DOM["old_options_dropdown"].classList.remove('open_select')
    MENU_DOM["options_dropdown"].classList.remove('open_select')
    MENU_DOM["options_new_amount"].classList.remove('selected')
    MENU_DOM["options_old_amount"].classList.remove('selected')
    MENU_DOM["options_theme"].classList.remove('selected')

    // open specific nested option
    if (target.id === 'options_new_amount') {
        MENU_DOM["new_options_dropdown"].classList.add('open_select')
        MENU_DOM["options_new_amount"].classList.add('selected')
    } else if (target.id === 'options_old_amount') {
        MENU_DOM["old_options_dropdown"].classList.add('open_select')
        MENU_DOM["options_old_amount"].classList.add('selected')
    } else if (target.id === 'options_theme') {
        MENU_DOM["options_dropdown"].classList.add('open_select')
        MENU_DOM["options_theme"].classList.add('selected')
    }




    // select nested option
    if (target.classList.contains('option_item')) {

        var category = target.parentNode;
        var category_title = category.parentNode.children[0].children[1];
        var element_data = target.getAttribute('data')

        console.warn('ici-sha', element_data)

        // change number of new entries on_scroll_top
        if (category.id === 'new_options_dropdown') {
            category_title.innerHTML = element_data;
            new_top_tweets = parseInt(element_data, 10);

            // change number of older elements on_scroll_bottom
        } else if (category.id === 'old_options_dropdown') {
            category_title.innerHTML = element_data;
            old_bottom_tweets = parseInt(element_data, 10);

            // change theme
        } else if (category.id === 'options_dropdown') {
            category_title.innerHTML = themes[element_data];
            DOM_BODY.className = element_data;
        }

    }

    // close nested dropdowns
    if (target.classList.contains('options_container')) {
        MENU_DOM["new_options_dropdown"].classList.remove('open_select')
        MENU_DOM["old_options_dropdown"].classList.remove('open_select')
        MENU_DOM["options_dropdown"].classList.remove('open_select')
    }
})
