# ID remapping

Discord assigns new IDs when a missing role or channel is recreated. The restore engine records old snapshot IDs to new Discord IDs. Categories are restored before child channels so saved parent references can use the new category IDs. Channel role overrides use the role map before they are applied.
