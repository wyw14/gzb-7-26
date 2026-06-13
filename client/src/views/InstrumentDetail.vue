<template>
  <div class="instrument-detail" v-if="instrument">
    <div class="container">
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/instruments' }">乐器市场</el-breadcrumb-item>
        <el-breadcrumb-item>{{ instrument.name }}</el-breadcrumb-item>
      </el-breadcrumb>
      
      <div class="detail-grid">
        <div class="image-section card">
          <img :src="instrument.image" :alt="instrument.name" class="main-image" />
          <div class="image-tags">
            <span class="badge badge-primary">{{ instrument.category }}</span>
            <span class="badge badge-success">{{ instrument.condition }}</span>
            <span class="badge" :class="instrument.status === 'available' ? 'badge-success' : 'badge-warning'">
              {{ instrument.status === 'available' ? '可借用' : '借用中' }}
            </span>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-card card mb-20">
            <h1 class="inst-name">{{ instrument.name }}</h1>
            <div class="info-meta">
              <span><el-icon><Goods /></el-icon> {{ instrument.brand }} {{ instrument.model }}</span>
              <span><el-icon><Medal /></el-icon> {{ instrument.level }}</span>
              <span><el-icon><Location /></el-icon> {{ instrument.location }}</span>
              <span v-if="instrument.distance !== undefined" class="highlight">
                距你 {{ instrument.distance }}km
              </span>
            </div>
            
            <div class="price-block">
              <div class="daily-fee">
                <span class="currency">¥</span>
                <span class="num">{{ instrument.dailyFee }}</span>
                <span class="unit">/天</span>
              </div>
              <div class="fee-info">
                <div>押金 <b>¥{{ instrument.deposit }}</b></div>
                <div>参考价值 <b>¥{{ instrument.value }}</b></div>
              </div>
            </div>
            
            <div class="action-row">
              <el-button type="primary" size="large" :disabled="instrument.status !== 'available' || isOwner" @click="showBorrow = true">
                <el-icon><Wallet /></el-icon>
                {{ isOwner ? '这是您发布的乐器' : instrument.status === 'available' ? '申请借用' : '暂不可借' }}
              </el-button>
              <el-button size="large" :disabled="isOwner" @click="showInvite = true">
                <el-icon><ChatDotRound /></el-icon>
                邀约主人练琴
              </el-button>
            </div>
          </div>
          
          <div class="desc-card card mb-20">
            <h3><el-icon><Document /></el-icon> 乐器描述</h3>
            <p>{{ instrument.description }}</p>
            
            <h4 class="mt-20">可借用时间</h4>
            <div class="tags">
              <span class="tag tag-time" v-for="t in instrument.availableTimes" :key="t">{{ t }}</span>
            </div>
          </div>
          
          <div class="owner-card card" v-if="instrument.owner">
            <h3><el-icon><User /></el-icon> 乐器主人</h3>
            <div class="owner-row">
              <router-link :to="`/buddies/${instrument.owner.id}`" class="owner-info">
                <img :src="instrument.owner.avatar" class="avatar-lg" />
                <div class="owner-detail">
                  <div class="owner-name">{{ instrument.owner.username }}</div>
                  <div class="owner-level">
                    <span class="badge badge-primary">{{ instrument.owner.skillLevel }}</span>
                    <span class="rating">
                      <el-icon><Star /></el-icon>
                      {{ instrument.owner.rating }} ({{ instrument.owner.reviewCount }}评价)
                    </span>
                  </div>
                  <div class="owner-bio">{{ instrument.owner.bio }}</div>
                </div>
              </router-link>
              <div class="owner-actions">
                <router-link :to="`/buddies/${instrument.owner.id}`">
                  <el-button>查看主页</el-button>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="section-card card" v-if="ownerReviews.length">
        <h3><el-icon><ChatLineSquare /></el-icon> 主人的评价 ({{ ownerReviews.length }})</h3>
        <div class="review-list">
          <div class="review-item" v-for="r in ownerReviews" :key="r.id">
            <img :src="r.reviewer?.avatar" class="avatar-sm" />
            <div class="review-content">
              <div class="review-header">
                <span class="reviewer">{{ r.reviewer?.username }}</span>
                <el-rate v-model="r.rating" disabled size="small" />
                <span class="badge badge-primary">{{ r.context }}</span>
              </div>
              <p class="review-text">{{ r.content }}</p>
              <span class="review-time">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <el-dialog v-model="showBorrow" :title="borrowStep === 1 ? '申请借用' : '协议预览与确认'" width="600px" :close-on-click-modal="false">
      <div v-if="borrowStep === 1">
        <el-form :model="borrowForm" label-width="90px">
          <el-form-item label="乐器">
            <span>{{ instrument.name }}</span>
          </el-form-item>
          <el-form-item label="借用日期">
            <el-date-picker
              v-model="borrowForm.dates"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :disabled-date="disabledDate"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="交接地点">
            <el-input v-model="borrowForm.handoverLocation" placeholder="请输入交接地点，默认为乐器所在地" />
            <div class="form-tip">默认：{{ instrument.location }}</div>
          </el-form-item>
          <el-form-item label="借用目的">
            <el-input v-model="borrowForm.purpose" type="textarea" :rows="3" placeholder="请描述借用目的，如：练习演出曲目等" />
          </el-form-item>
          <el-form-item label="费用预估">
            <span class="text-danger">押金 ¥{{ instrument.deposit }} + 租金 ¥{{ estimatedFee }} = 共 ¥{{ instrument.deposit + estimatedFee }}</span>
          </el-form-item>
        </el-form>
      </div>
      
      <div v-else class="agreement-preview">
        <div class="agreement-header">
          <el-icon :size="24" color="#409eff"><Document /></el-icon>
          <span class="agreement-title">乐器借用协议</span>
        </div>
        <div class="agreement-summary">
          <div class="summary-item">
            <span class="label">借用乐器：</span>
            <span class="value">{{ instrument.name }}</span>
          </div>
          <div class="summary-item">
            <span class="label">借用期限：</span>
            <span class="value">{{ previewData?.summary?.startDate }} 至 {{ previewData?.summary?.endDate }}（共{{ previewData?.summary?.days }}天）</span>
          </div>
          <div class="summary-item">
            <span class="label">交接地点：</span>
            <span class="value">{{ previewData?.summary?.handoverLocation }}</span>
          </div>
          <div class="summary-item">
            <span class="label">费用合计：</span>
            <span class="value text-danger">¥{{ previewData?.summary?.totalAmount }}</span>
          </div>
        </div>
        <div class="agreement-text">
          <pre>{{ previewData?.agreement }}</pre>
        </div>
        <el-form-item class="agree-item">
          <el-checkbox v-model="agreed">我已阅读并同意以上《乐器借用协议》的全部条款</el-checkbox>
        </el-form-item>
      </div>
      
      <template #footer>
        <template v-if="borrowStep === 1">
          <el-button @click="showBorrow = false">取消</el-button>
          <el-button type="primary" :loading="previewLoading" @click="previewAgreement">下一步：预览协议</el-button>
        </template>
        <template v-else>
          <el-button @click="borrowStep = 1">上一步</el-button>
          <el-button type="primary" :loading="submitting" :disabled="!agreed" @click="submitBorrow">确认并提交申请</el-button>
        </template>
      </template>
    </el-dialog>
    
    <el-dialog v-model="showInvite" title="邀约练琴" width="500px">
      <el-form :model="inviteForm" label-width="90px">
        <el-form-item label="想练乐器">
          <el-input v-model="inviteForm.instrument" placeholder="如：古典吉他二重奏" />
        </el-form-item>
        <el-form-item label="想练曲目">
          <el-input v-model="inviteForm.piece" placeholder="如：爱的罗曼史" />
        </el-form-item>
        <el-form-item label="约练时间">
          <el-date-picker
            v-model="inviteForm.meetTime"
            type="datetime"
            placeholder="选择约练时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="约练地点">
          <el-input v-model="inviteForm.location" placeholder="建议选公共空间：咖啡馆/音乐教室等" />
        </el-form-item>
        <el-form-item label="留言">
          <el-input v-model="inviteForm.message" type="textarea" :rows="3" placeholder="想说点什么..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInvite = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInvite">发送邀约</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { instrumentApi, borrowApi, invitationApi, reviewApi } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Goods, Medal, Location, Wallet, ChatDotRound, Document, User, Star, ChatLineSquare } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const requireLogin = inject('requireLogin', () => router.push('/login'))

const instrument = ref(null)
const ownerReviews = ref([])
const showBorrow = ref(false)
const showInvite = ref(false)
const submitting = ref(false)
const previewLoading = ref(false)
const borrowStep = ref(1)
const previewData = ref(null)
const agreed = ref(false)

const borrowForm = reactive({
  dates: null,
  purpose: '',
  handoverLocation: ''
})

const inviteForm = reactive({
  instrument: '',
  piece: '',
  meetTime: null,
  location: '',
  message: ''
})

const isOwner = computed(() => userStore.userId === instrument.value?.ownerId)

const estimatedFee = computed(() => {
  if (!borrowForm.dates || !instrument.value) return 0
  const days = Math.ceil((borrowForm.dates[1] - borrowForm.dates[0]) / (1000 * 60 * 60 * 24)) + 1
  return days * instrument.value.dailyFee
})

watch(showBorrow, (val) => {
  if (!val) {
    borrowStep.value = 1
    previewData.value = null
    agreed.value = false
  }
})

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7
}

onMounted(async () => {
  try {
    instrument.value = await instrumentApi.get(route.params.id)
    inviteForm.value.instrument = instrument.value.category
    
    ownerReviews.value = await reviewApi.list({ revieweeId: instrument.value.ownerId, targetType: 'user' })
  } catch (e) {
    ElMessage.error('加载失败')
  }
})

const previewAgreement = async () => {
  if (!userStore.isLoggedIn) {
    showBorrow.value = false
    requireLogin()
    return
  }
  if (!borrowForm.dates) {
    ElMessage.warning('请选择借用日期')
    return
  }
  previewLoading.value = true
  try {
    const result = await borrowApi.preview({
      instrumentId: instrument.value.id,
      borrowerId: userStore.userId,
      ownerId: instrument.value.ownerId,
      startDate: borrowForm.dates[0].toISOString().split('T')[0],
      endDate: borrowForm.dates[1].toISOString().split('T')[0],
      purpose: borrowForm.purpose,
      handoverLocation: borrowForm.handoverLocation || instrument.value.location
    })
    previewData.value = result
    agreed.value = false
    borrowStep.value = 2
  } catch (e) {
    ElMessage.error('生成协议失败')
  } finally {
    previewLoading.value = false
  }
}

const submitBorrow = async () => {
  if (!agreed.value) {
    ElMessage.warning('请先阅读并同意借用协议')
    return
  }
  submitting.value = true
  try {
    const result = await borrowApi.create({
      instrumentId: instrument.value.id,
      borrowerId: userStore.userId,
      ownerId: instrument.value.ownerId,
      startDate: borrowForm.dates[0].toISOString().split('T')[0],
      endDate: borrowForm.dates[1].toISOString().split('T')[0],
      purpose: borrowForm.purpose,
      handoverLocation: borrowForm.handoverLocation || instrument.value.location,
      depositPaid: instrument.value.deposit,
      feeTotal: estimatedFee.value,
      agreement: previewData.value.agreement
    })
    ElMessage.success('借用申请已发送，请等待主人确认！')
    showBorrow.value = false
    borrowStep.value = 1
    router.push('/messages')
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const submitInvite = async () => {
  if (!userStore.isLoggedIn) {
    showInvite.value = false
    requireLogin()
    return
  }
  if (!inviteForm.instrument || !inviteForm.meetTime || !inviteForm.location) {
    ElMessage.warning('请填写完整的邀约信息')
    return
  }
  submitting.value = true
  try {
    await invitationApi.create({
      inviterId: userStore.userId,
      inviteeId: instrument.value.ownerId,
      instrument: inviteForm.instrument,
      piece: inviteForm.piece,
      skillLevelMatch: `${userStore.currentUser.skillLevel}-${instrument.value.owner?.skillLevel}`,
      meetTime: new Date(inviteForm.meetTime).toLocaleString('zh-CN', { hour12: false }),
      location: inviteForm.location,
      latitude: instrument.value.latitude,
      longitude: instrument.value.longitude,
      message: inviteForm.message
    })
    ElMessage.success('邀约已发送，期待好消息！')
    showInvite.value = false
    router.push('/messages')
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.breadcrumb {
  margin: 20px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.image-section {
  padding: 24px;
}

.main-image {
  width: 100%;
  border-radius: 12px;
  aspect-ratio: 4/3;
  object-fit: cover;
  margin-bottom: 16px;
}

.image-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.inst-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.info-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.info-meta > span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.highlight {
  color: var(--success-color) !important;
  font-weight: 600;
}

.price-block {
  padding: 20px;
  background: linear-gradient(135deg, #f0f4ff, #faf5ff);
  border-radius: 12px;
  margin-bottom: 20px;
}

.daily-fee {
  margin-bottom: 10px;
}

.currency {
  font-size: 20px;
  color: var(--primary-color);
  vertical-align: top;
}

.num {
  font-size: 40px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
}

.unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.fee-info {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-secondary);
}

.fee-info b {
  color: var(--text-primary);
}

.action-row {
  display: flex;
  gap: 12px;
}

.action-row .el-button {
  flex: 1;
}

.desc-card h3,
.owner-card h3,
.section-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  margin-bottom: 14px;
}

.desc-card h4 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.desc-card p {
  line-height: 1.8;
  color: var(--text-primary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.tag-time {
  background: #ecfeff;
  color: #0e7490;
}

.owner-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.owner-info {
  display: flex;
  gap: 14px;
  flex: 1;
}

.owner-detail {
  flex: 1;
}

.owner-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.owner-level {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #f59e0b;
}

.owner-bio {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.section-card {
  padding: 24px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--bg-light);
  border-radius: 10px;
}

.review-content {
  flex: 1;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.reviewer {
  font-weight: 500;
}

.review-text {
  line-height: 1.6;
  margin-bottom: 6px;
}

.review-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.text-danger {
  color: var(--danger-color);
  font-weight: 600;
}

.mt-20 {
  margin-top: 20px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.agreement-preview {
  max-height: 60vh;
  overflow-y: auto;
}

.agreement-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--primary-color);
}

.agreement-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.agreement-summary {
  background: var(--bg-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  padding: 6px 0;
  font-size: 14px;
}

.summary-item .label {
  color: var(--text-secondary);
  width: 90px;
  flex-shrink: 0;
}

.summary-item .value {
  color: var(--text-primary);
  font-weight: 500;
}

.agreement-text {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.agreement-text pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  margin: 0;
}

.agree-item {
  margin-bottom: 0;
  justify-content: center;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
