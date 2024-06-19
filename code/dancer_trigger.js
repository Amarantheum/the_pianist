outlets = 1;

var previous_position_right = [0, 0, 0];
var previous_position_left = [0, 0, 0];

var previous_speed_left = 0;
var previous_speed_right = 0;

var prev_accel_left_size = 5;
var prev_accel_left_pos = 0;
var prev_accel_left = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var prev_accel_right_size = 5;
var prev_accel_right_pos = 0;
var prev_accel_right = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var accel_threshold = 0.0;

var scale_factor = 0.5;

var accel_scale_factor = 0.1;

var triggered = false;

var speed_threshold = 0.1;

var values = [];
var recording = false;

var cur_section = 0;

function section(val) {
    if (val == cur_section) {
        return;
    }
    cur_section = val;
    if (cur_section >= 1 || cur_section <= 3) {
        prev_accel_left_size = 5;
        prev_accel_right_size = 5;
    } else if (cur_section == 4) {
        prev_accel_left_size = 2;
        prev_accel_right_size = 2;
    } else if (cur_section == 5) {
        prev_accel_left_size = 1;
        prev_accel_right_size = 1;
    }
}

function record() {
    recording = true;
    values = [];
}

function stop() {
    recording = false;
    post(values);
}

function get_position(spinex, spiney, spinez, x, y, z) {
    return [x - spinex, y - spiney, z - spinez];
}

function reset() {
    triggered = false;
}

function trigger() {
    if (triggered) {
        return;
    }
    triggered = true;
    outlet(0, "bang");
    var reset_task = new Task(reset);
    reset_task.schedule(100);
}

function input(spinex, spiney, spinez, leftx, lefty, leftz, rightx, righty, rightz) {
    var position_left = get_position(spinex, spiney, spinez, leftx, lefty, leftz);
    var position_right = get_position(spinex, spiney, spinez, rightx, righty, rightz);

    var scaled_prev_left = scale_vector(previous_position_left, (1 - scale_factor));
    var scaled_pos_left = scale_vector(position_left, scale_factor);
    var new_position_left = add_vectors(scaled_pos_left, scaled_prev_left);

    var scaled_prev_right = scale_vector(previous_position_right, (1 - scale_factor));
    var scaled_pos_right = scale_vector(position_right, scale_factor);
    var new_position_right = add_vectors(scaled_pos_right, scaled_prev_right);

    var vel_left = subtract_vectors(new_position_left, previous_position_left);
    var vel_right = subtract_vectors(new_position_right, previous_position_right);

    var speed_left = get_mag(vel_left);
    var speed_right = get_mag(vel_right);

    var accel_left = speed_left - previous_speed_left;
    var accel_right = speed_right - previous_speed_right;

    var previous_accel_left = prev_accel_left[prev_accel_left_pos];
    var previous_accel_right = prev_accel_right[prev_accel_right_pos];

    var accel_left = accel_left * accel_scale_factor + previous_accel_left * (1 - accel_scale_factor);
    var accel_right = accel_right * accel_scale_factor + previous_accel_right * (1 - accel_scale_factor);

    if (recording) {
        values.push(accel_left * 1000);
    }

    var left_pos = true;
    var right_pos = true;
    var left_max = -10000000;
    var right_max = -10000000;
    for (var i = 0; i < prev_accel_left_size; i++) {
        if (prev_accel_left[i] < accel_threshold) {
            left_pos = false;
        }
        if (prev_accel_left[i] > left_max) {
            left_max = prev_accel_left[i];
        }
        if (prev_accel_right[i] < accel_threshold) {
            right_pos = false;
        }
        if (prev_accel_right[i] > right_max) {
            right_max = prev_accel_right[i];
        }
    }

    if (left_max > accel_threshold + 0.001 && left_pos && accel_left < accel_threshold) {
        trigger();
    }
    
    if (right_max > accel_threshold + 0.001 && right_pos && accel_right < accel_threshold) {
        trigger();
    }

    previous_position_left = new_position_left;
    previous_position_right = new_position_right;

    previous_speed_left = speed_left;
    previous_speed_right = speed_right;

    prev_accel_left_pos = (prev_accel_left_pos + 1) % prev_accel_left_size;
    prev_accel_right_pos = (prev_accel_right_pos + 1) % prev_accel_right_size;

    prev_accel_left[prev_accel_left_pos] = accel_left;
    prev_accel_right[prev_accel_right_pos] = accel_right;
}

function scale_vector(vector, scale) {
    return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function add_vectors(vector1, vector2) {
    return [vector1[0] + vector2[0], vector1[1] + vector2[1], vector1[2] + vector2[2]];
}

function get_mag(vector) {
    return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2));
}

function subtract_vectors(vector1, vector2) {
    return [vector1[0] - vector2[0], vector1[1] - vector2[1], vector1[2] - vector2[2]];
}