import {View, Text} from 'react-native'
import { useFoodOrderingEvalFixture } from "@/verification/useEvalFixture";

const Profile = () => {
    const evaluation = useFoodOrderingEvalFixture();
    if (evaluation.status !== "ready") return null;
    return (
        <View>
            <Text>{evaluation.fixture.about.title}</Text>
        </View>
    )
}

export default Profile
