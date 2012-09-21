import smach

from smach_executer.action import Action

def create_state_machine_from_action_dict(action_dict, actions):
    '''
    request_dict: parsed JSON request
    actions: dictionary that maps action names to classes
    '''
    try:
        action_name = action_dict['name']
    except KeyError:
        raise ValueError('Action missing "name" field')
    
    try:
        action_inputs = action_dict['inputs']
    except KeyError:
        raise ValueError('Action missing "inputs" field')

    try:
        ActionClass = actions[action_name]
    except KeyError:
        raise ValueError('Unknown action type: "%s"' % action_name)
    action = ActionClass()

    # TODO: if action is already a StateMachine, don't need to make a wrapper for it

    # create state machine wrapper and set inputs
    outcomes = outcomes=action.get_registered_outcomes()
    sm = smach.StateMachine(outcomes)
    for input_name, input_val in action_inputs:
        sm.userdata[input_name] = input_val

    # add this one action to the wrapper state machine
    with sm:
        smach.StateMachine.add('state_%d' % (0,), action, transitions={x:x for x in outcomes})
        
    return sm

