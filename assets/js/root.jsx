import React from 'react';
import ReactDOM from 'react-dom';
import { Link, BrowserRouter as Router, Route } from 'react-router-dom';
import _ from 'lodash';
import $ from 'jquery';

import Header from './Header';
import Notification from './Notification';
import Post from './Post';
import UserProfile from './UserProfile';
import RegisterForm from './RegisterForm';
import EditUserForm from './EditUserForm';

export default function root_init(node, channel) {
    let element = (
        <div>
          <h1>Hello, world!</h1>
          <h2>It is {new Date().toLocaleTimeString()}.</h2>
        </div>
    );
    ReactDOM.render(<Root channel={channel} />, node);
}

class Root extends React.Component {
    constructor(props) {
        super(props);
        let session = null;
        this.channel = props.channel;
    
        if( localStorage["project2_session"]) {
            session = JSON.parse( localStorage["project2_session"]);
        
            // subscribe if logged in
            this.channel
                .join()
                .receive("ok", r => { this.channel.push("subscribe", session); this.setChannelJoined(); })
                .receive("error", r => { console.log("failed to join", r); })
        }
        this.state = {
            login_form: {email: "", password: ""},
            session: session,
            error: null,
            users: [],
            notification: null, // for now, allow max of one notif at any given time
            channelJoined: false,
        };
        this.fetch_users();

        let friendRequestNotif = (payload) => {
          this.setNotif(payload, "FRIEND_REQUEST");
        };
        this.channel.on("friend_request", friendRequestNotif.bind(this));

    }
   
    setChannelJoined() {
      this.setState(_.assign({}, this.state, {channelJoined: true}));
    }
 
    setNotif(payload, type) {
      let closeNotif = () => {
        this.setState(_.assign({}, this.state, {notification: null}));
      }

      let notifProps = _.assign({}, payload, {type: type});
      let notif = <Notification {...payload} type={type} closeCallback={closeNotif.bind(this)} />
      this.setState(_.assign({}, this.state, {notification: notif}));
    }

    update_login_form(data) {
        let form1 = _.assign({}, this.state.login_form, data);
        let state1 = _.assign({}, this.state, { login_form: form1 });
        this.setState(state1);
    }

    login() {
        $.ajax("/api/v1/auth", {
            method: "post",
            dataType: "json",
            contentType: "application/json; charset=UTF-8",
            data: JSON.stringify(this.state.login_form),
            success: (resp) => {
                localStorage["project2_session"] = JSON.stringify(resp.data);
                let state1 = _.assign({}, this.state, { session: resp.data, error: null });
                this.setState(state1);
                window.location.href = "/users/" + this.state.session.user_id;

                if (this.state.channelJoined) {
                    // if already joined channle, just subscribe
                    this.channel.push("subscribe", resp.data);
                } else {
                    // if not already joined channel, join channel after logging in
                    this.channel
                        .join()
                        .receive("ok", r => { console.log("subscribe"); this.channel.push("subscribe", resp.data) })
                        .receive("error", r => { console.log("failed to join", r); });
                }
            },
            error: (resp) => {
                let state1 = _.assign({}, this.state, { error: "Login failed"});
                this.setState(state1);
            }
        });
    }

    logout() {
        delete localStorage["project2_session"];
        let state1 = _.assign({}, this.state, {session:null});
        this.setState(state1);    
        window.location.href = "/";
        
        // unsubscribe after logging out
        this.channel.push("unsubscribe", {});
    }

    render() {
      return <Router>
        <div>
          <Header session={this.state.session} root={this} />
          {this.state.notification}
          <Route path="/users" exact={true} render={() =>
            <UserList users={this.state.users} />
          } />
          <Route path="/users/:id" render={(props) => 
            <UserProfile {...props} session={this.state.session} />
          } />
          <Route path="/posts/:id" render={(props) =>
            <Post {...props} session={this.state.session} />
          } />
          <Route path="/register" component={RegisterForm} />
          <Route path="/edituser" render={() =>
                  <EditUserForm logout={this.logout.bind(this)} user_id={this.state.session && this.state.session.user_id || 0} />
          } />

        </div>
      </Router>;
    }

    fetch_users() {
        $.ajax("/api/v1/users", {
            method: "get",
            dataType: "json",
            contentType: "application/json; charset=UTF-8",
            data: "",
            success: (resp) => {
                let state1 = _.assign({}, this.state, { users: resp.data });
                this.setState(state1);
            }
        });
    }
}


function UserList(props) {
      let rows = _.map(props.users, (uu) => <User key={uu.id} user={uu} />);
      return <div className="row">
            <div className="col-12">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>email</th>
                    <th>display name</th>
                  </tr>
                </thead>
                <tbody>
                  {rows}
            </tbody>
              </table>
            </div>
          </div>;
}

function User(props) {
      let {user} = props;
      return <tr>
            <td>{user.email}</td>
            <td>{user.display_name}</td>
          </tr>;
}
